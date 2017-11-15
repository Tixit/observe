var proto = require("proto")
var EventEmitter = require("events").EventEmitter
var utils = require("./utils")


// emits the event:
    // change - the event data is an object of one of the following forms:
        // {data:_, type: 'set', property: propertyList}
        // {data:_, type: 'added', property: propertyList, index:_, count: numberOfElementsAdded}
        // {data:_, type: 'removed', property: propertyList, index:_, removed: removedValues}
var Observe = module.exports = proto(EventEmitter, function(superclass) {

    // static members

    this.init = function(obj) {
        this.subject = obj
        this.internalChangeListeners = []

        this.setMaxListeners(1000)
    }

    // instance members

    // gets an element or member of the subject and returns another Observee
    // changes to the returned Observee will be emitted by its parent as well
    this.get = function(property) {
        return ObserveeChild(this, parsePropertyList(property))
    }

    // sets a value on the subject
    // property - either an array of members to select, or a string where properties to select are separated by dots
    // value - the value to set
    this.set = function(property, value) {
        setInternal(this, parsePropertyList(property), value, {})
    }

    this.unset = function(property) {
        unsetInternal(this, parsePropertyList(property), {})
    }

    // pushes a value onto a list
    this.push = function(/*value...*/) {
        pushInternal(this, [], arguments, {})
    }

    this.pop = function() {
        var elements = spliceInternal(this, [], [this.subject.length-1,1], {})
        return elements[0]
    }

    this.unshift = function(/*value...*/) {
        spliceInternal(this, [], [0,0].concat(Array.prototype.slice.call(arguments, 0)), {})
    }
    this.shift = function() {
        var elements = spliceInternal(this, [], [0,1], {})
        return elements[0]
    }

    this.reverse = function() {
        this.subject.reverse()
        this.emit('change', {
            type:'set', property: []
        })
    }

    this.sort = function() {
        this.subject.sort.apply(this.subject, arguments)
        this.emit('change', {
            type:'set', property: []
        })
    }

    // index is the index to remove/insert at
    // countToRemove is the number to remove
    // elementsToAdd is a list of elements to add
    this.splice = function(/*index, countToRemove[, elementsToAdd]*/) {
        return spliceInternal(this, [], arguments, {})
    }

    // use this instead of concat for mutation behavior
    this.append = function(arrayToAppend) {
        appendInternal(this, [], arguments, {})
    }

    this.data = this.id = function(data) {
        return ObserveeChild(this, [], {data: data})
    }

    /*override*/ this.emit = function(type) {
        if(type === 'change') {
            var args = Array.prototype.slice.call(arguments, 1)
            this.internalChangeListeners.forEach(function(handler) {
                handler.apply(this, args)
            }.bind(this))
        }
        superclass.prototype.emit.apply(this, arguments)
    }

    // For the returned object, any property added via set, push, splice, or append joins an internal observee together with this observee, so that
    //      the internal observee and the containing observee will both send 'change' events appropriately
    // collapse - (default: false) if true, any property added will be set to the subject of the value added (so that value won't be an observee anymore
        // note: only use collapse:true if the observees you're unioning isn't actually an object that inherits from an observee - any instance methods on the observee that come from child classes won't be accessible anymore
        // e.g. var x = observe({a:5})
        //      var b = observe({})
        //      x.subject.a === 5    ;; true
        //      b.union(true).set('x', x)
        //      b.subject.x.a === 5            ;; true
        //      b.subject.x.subject.a === 5    ;; false
    this.union = function(collapse) {
        if(collapse === undefined) collapse = false
        return ObserveeChild(this, [], {union: collapse})
    }


    /* pause and unpause may cause weird affects in certain cases (e.g. if you remove an element at index 4 and *then* add an element at index 2)
    // pause sending events (for when you want to do a lot of things to an object)
    this.pause = function() {
        this.paused = true
    }
    this.unpause = function() {
        this.paused = undefined
        sendEvent(this)
    }*/

    // private

    this.onChangeInternal = function(handler) {
        this.internalChangeListeners.push(handler)
    }
    this.offChangeInternal = function(handler) {
        var index = this.internalChangeListeners.indexOf(handler)
        this.internalChangeListeners.splice(index,1)
    }
})


function parsePropertyList(property) {
    if(!(property instanceof Array)) {
        property = property.toString().split('.')
    }

    return property
}

function getPropertyPointer(subject, propertyList) {
    var current = subject
    for(var n=0; n<propertyList.length-1; n++) {
        current = current[propertyList[n]]
    }

    return {obj: current, key:propertyList[n]}
}

var getPropertyValue = module.exports.getPropertyValue = function(subject, property) {
    var pointer = getPropertyPointer(subject, property)
    if(pointer.key !== undefined) {
        return pointer.obj[pointer.key]
    } else {
        return pointer.obj
    }
}

// private

// options can have the properties:
    // union - if true, any value set, pushed, appended, or spliced onto the observee is unioned
var ObserveeChild = proto(EventEmitter, function() {

    this.init = function(parent, propertyList, options) {
        if(options === undefined) this.options = {}
        else                      this.options = options

        if(parent._observeeParent !== undefined)
            this._observeeParent = parent._observeeParent
        else
            this._observeeParent = parent

        this.property = propertyList
        this.subject = getPropertyValue(parent.subject, propertyList)

        var that = this, changeHandler
        parent.onChangeInternal(changeHandler=function(change) {
            var answers = changeQuestions(that.property, change, that.options.union)

            if(answers.isWithin) {
                if(change.type === 'set' && change.property.length <= that.property.length && that.options.union === undefined) { // if the subject may have been replaced with a new subject
                    var pointer = getPropertyPointer(parent.subject, propertyList)
                    if(pointer.obj !== undefined) {
                        if(pointer.key !== undefined) {
                            that.subject =pointer.obj[pointer.key]
                        } else {
                            that.subject =pointer.obj
                        }
                    }
                }

                that.emit('change', {
                    type:change.type, property: change.property.slice(that.property.length),
                    index:change.index, count:change.count, removed: change.removed, data: change.data
                })
            } else if(answers.couldRelocate) {
                if(change.type === 'removed') {
                    var relevantIndex = that.property[change.property.length]
                    var lastRemovedIndex = change.index + change.removed.length - 1
                    if(lastRemovedIndex < relevantIndex) {
                        that.property[change.property.length] = relevantIndex - change.removed.length // change the propertyList to match the new index
                    } else if(lastRemovedIndex === relevantIndex) {
                        parent.offChangeInternal(changeHandler)
                    }
                } else if(change.type === 'added') {
                    var relevantIndex = parseInt(that.property[change.property.length])
                    if(change.index <= relevantIndex) {
                        that.property[change.property.length] = relevantIndex + change.count // change the propertyList to match the new index
                    }
                } else if(change.type === 'set') {
                    parent.offChangeInternal(changeHandler)
                }
            }
        })
    }

    this.get = function(property) {
        var result = this._observeeParent.get(this.property.concat(parsePropertyList(property)))
        result.options = this.options
        return result
    }

    this.set = function(property, value) {
        setInternal(this._observeeParent, this.property.concat(parsePropertyList(property)), value, this.options)
    }
    this.unset = function(property) {
        unsetInternal(this._observeeParent, this.property.concat(parsePropertyList(property)), this.options)
    }

    this.push = function(/*values...*/) {
        pushInternal(this._observeeParent, this.property, arguments, this.options)
    }
    this.pop = function() {
        var elements = spliceInternal(this._observeeParent, this.property, [this.subject.length-1,1], this.options)
        return elements[0]
    }

    this.unshift = function(/*value...*/) {
        spliceInternal(this._observeeParent, this.property, [0,0].concat(Array.prototype.slice.call(arguments,0)), this.options)
    }
    this.shift = function() {
        var elements = spliceInternal(this._observeeParent, this.property, [0,1], this.options)
        return elements[0]
    }

    this.splice = function(index, countToRemove/*[, elementsToAdd....]*/) {
        return spliceInternal(this._observeeParent, this.property, arguments, this.options)
    }

    this.reverse = function() {
        this.subject.reverse()
        this.emit('change', {
            type:'set', property: []
        })
    }

    this.sort = function() {
        this.subject.sort.apply(this.subject, arguments)
        this.emit('change', {
            type:'set', property: []
        })
    }

    this.append = function(/*[property,] arrayToAppend*/) {
        appendInternal(this._observeeParent, this.property, arguments, this.options)
    }

    this.data = this.id = function(data) {
        return ObserveeChild(this._observeeParent, this.property, utils.merge({}, this.options, {data: data}))
    }

    this.union = function(collapse) {
        if(collapse === undefined) collapse = false
        return ObserveeChild(this, [], utils.merge({}, this.options, {union: collapse}))
    }

})



// that - the Observee object
function setInternal(that, propertyList, value, options) {
    if(propertyList.length === 0) throw new Error("You can't set at the top-level, setting like that only works for ObserveeChild (sub-observees created with 'get')")

    var pointer = getPropertyPointer(that.subject, propertyList)

    var internalObservee = value
    if(options.union === true) {
        value = value.subject
    }

    pointer.obj[pointer.key] = value

    var event = {type: 'set', property: propertyList}
    if(options.data !== undefined) event.data = event.id = options.data
    that.emit('change',event)

    if(options.union !== undefined)
        unionizeEvents(that, internalObservee, propertyList, options.union)
}

// that - the Observee object
function unsetInternal(that, propertyList, options) {
    if(propertyList.length === 0) throw new Error("You can't set at the top-level, setting like that only works for ObserveeChild (sub-observees created with 'get')")

    var pointer = getPropertyPointer(that.subject, propertyList)

    delete pointer.obj[pointer.key]

    var event = {type: 'unset', property: propertyList}
    if(options.data !== undefined) event.data = event.id = options.data
    that.emit('change',event)
}

function pushInternal(that, propertyList, args, options) {
    var array = getPropertyValue(that.subject, propertyList)
    var originalLength = array.length
    array.push.apply(array, args)

    var internalObservees = unionizeList(array, originalLength, args.length, options.union)

    var event = {type: 'added', property: propertyList, index: originalLength, count: args.length}
    if(options.data !== undefined) event.data = event.id = options.data
    that.emit('change', event)

    unionizeListEvents(that, internalObservees, propertyList, options.union)
}

function spliceInternal(that, propertyList, args, options) {
    var index = args[0]
    var countToRemove = args[1]

    var array = getPropertyValue(that.subject, propertyList)
    var result = array.splice.apply(array, args)

    if(countToRemove > 0) {
        var event = {type: 'removed', property: propertyList, index: index, removed: result}
        if(options.data !== undefined) event.data = event.id = options.data
        that.emit('change', event)
    }
    if(args.length > 2) {
        var event = {type: 'added', property: propertyList, index: index, count: args.length-2}

        var internalObservees = unionizeList(array, index, event.count, options.union)

        if(options.data !== undefined) event.data = event.id = options.data
        that.emit('change', event)

        unionizeListEvents(that, internalObservees, propertyList, options.union)
    }

    return result
}

// note: I'm not using splice to do this as an optimization (because otherwise the property list would have to be parsed twice and the value gotten twice) - maybe this optimization wasn't worth it but its already done
function appendInternal(that, propertyList, args, options) {
    var arrayToAppend = args[0]
    if(arrayToAppend.length === 0) return; //nothing to do

    var array = getPropertyValue(that.subject, propertyList)
    var originalLength = array.length

    var spliceArgs = [originalLength, 0]
    spliceArgs = spliceArgs.concat(arrayToAppend)
    var oldLength = array.length
    array.splice.apply(array, spliceArgs)

    var internalObservees = unionizeList(array, oldLength, array.length, options.union)

    var event = {type: 'added', property: propertyList, index: originalLength, count: arrayToAppend.length}
    if(options.data !== undefined) event.data = event.id = options.data
    that.emit('change', event)

    unionizeListEvents(that, internalObservees, propertyList, options.union)
}

// sets a slice of elements to their subjects and
// returns the original observee objects along with their indexes
function unionizeList(array, start, count, union) {
    var internalObservees = [] // list of observees and their property path
    if(union !== undefined) {
        var afterEnd = start+count
        for(var n=start; n<afterEnd; n++) {
            internalObservees.push({obj: array[n], index: n})
            if(union === true)
                array[n] = array[n].subject
        }
    }

    return internalObservees
}

// runs unionizeEvents for elements in a list
// internalObservees should be the result from `unionizeList`
function unionizeListEvents(that, internalObservees, propertyList, collapse) {
    for(var n=0; n<internalObservees.length; n++) {
        unionizeEvents(that, internalObservees[n].obj, propertyList.concat(internalObservees[n].index+''), collapse)
    }
}


// sets up the union change events for an observee with one of its inner properties
// parameters:
    // that - the container observee
    // innerObservee - the contained observee
    // propertyList - the propertyList to unionize
    // collapse - the union option (true for collapse)
function unionizeEvents(that, innerObservee, propertyList, collapse) {
    var propertyListDepth = propertyList.length

    if(innerObservee.on === undefined || innerObservee.emit === undefined || innerObservee.removeListener === undefined || innerObservee.set === undefined) {
        throw new Error("Attempting to union a value that isn't an observee")
    }

    var innerChangeHandler, containerChangeHandler
    var ignorableContainerEvents = [], ignorableInnerEvents = []
    innerObservee.on('change', innerChangeHandler = function(change) {
        if(ignorableInnerEvents.indexOf(change) === -1) {        // don't run this for events generated by the union event handlers
            if(collapse) {
                var property = propertyList.concat(change.property)
            } else {
                var property = propertyList.concat(['subject']).concat(change.property)
            }

            var containerChange = utils.merge({}, change, {property: property})
            ignorableContainerEvents.push(containerChange)
            that.emit('change', containerChange)
        }
    })
    that.onChangeInternal(containerChangeHandler = function(change) {
        var changedPropertyDepth = change.property.length

        if(collapse) {
            var propertyListToAskFor = propertyList
        } else {
            var propertyListToAskFor = propertyList.concat(['subject'])
        }

        var answers = changeQuestions(propertyListToAskFor, change, true)
        var changeIsWithinInnerProperty = answers.isWithin
        var changeCouldRelocateInnerProperty = answers.couldRelocate

        if(changeIsWithinInnerProperty && ignorableContainerEvents.indexOf(change) === -1) {   // don't run this for events generated by the union event handlers
            if(collapse) {
                var property = change.property.slice(propertyListDepth)
            } else {
                var property = change.property.slice(propertyListDepth+1) // +1 for the 'subject'
            }

            var innerObserveeEvent = utils.merge({}, change, {property: property})
            ignorableInnerEvents.push(innerObserveeEvent)
            innerObservee.emit('change', innerObserveeEvent)
        } else if(changeCouldRelocateInnerProperty) {
            if(change.type === 'set' /*&& changedPropertyDepth <= propertyListDepth  - this part already done above*/) {
                removeUnion()
            } else if(change.type === 'removed') {
                var relevantIndex = propertyList[change.property.length]
                var removedIndexesContainsIndexOfInnerObservee = change.index <= relevantIndex && relevantIndex <= change.index + change.removed.length - 1
                var removedIndexesAreBeforeIndexOfInnerObservee = change.index + change.removed.length - 1 < relevantIndex && relevantIndex

                if(removedIndexesContainsIndexOfInnerObservee && changedPropertyDepth <= propertyListDepth+1) {
                    removeUnion()
                } else if(removedIndexesAreBeforeIndexOfInnerObservee) {
                    propertyList[change.property.length] = relevantIndex - change.removed.length // change the propertyList to match the new index
                }
            } else if(change.type === 'added') {
                var relevantIndex = propertyList[change.property.length]
                if(change.index < relevantIndex) {
                    propertyList[change.property.length] = relevantIndex + change.count // change the propertyList to match the new index
                }
            }
        }
    })

    var removeUnion = function() {
        innerObservee.removeListener('change', innerChangeHandler)
        that.offChangeInternal(containerChangeHandler)
    }
}


// answers certain questions about a change compared to a property list
// returns an object like: {
    // isWithin: _,           // true if changeIsWithinInnerProperty
    // couldRelocate: _       // true if changeCouldRelocateInnerProperty or if innerProperty might be removed
// }
function changeQuestions(propertyList, change, union) {
    var propertyListDepth = propertyList.length
    var unioned = union!==undefined

    var changeIsWithinInnerProperty = true // assume true until proven otherwise
    var changeCouldRelocateInnerProperty = true // assume true until prove otherwise
    for(var n=0; n<propertyListDepth; n++) {
        // stringifying the property parts so that indexes can either be strings or integers, but must ensure we don't stringify undefined (possible todo: when/if you get rid of dot notation, this might not be necessary anymore? not entirely sure)
        if(change.property[n] === undefined || change.property[n]+'' !== propertyList[n]+'') {
            changeIsWithinInnerProperty = false
            if(n<change.property.length) {
                changeCouldRelocateInnerProperty = false
            }
        }
    }

    if(!unioned && change.property.length < propertyListDepth
       || unioned && (change.type === 'set' && change.property.length <= propertyListDepth   // if this is a unioned observee, replacing it actually removes it
                   || change.type !== 'set' && change.property.length < propertyListDepth)
    ) {
        changeIsWithinInnerProperty = false
    } else {
        changeCouldRelocateInnerProperty = false
    }

    return {couldRelocate: changeCouldRelocateInnerProperty, isWithin: changeIsWithinInnerProperty}
}