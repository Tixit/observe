!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.observe=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./utils":6,"events":2,"proto":5}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":4}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
"use strict";
/* Copyright (c) 2013 Billy Tetrud - Free to use for any purpose: MIT License*/

var prototypeName='prototype', undefined, protoUndefined='undefined', init='init', ownProperty=({}).hasOwnProperty; // minifiable variables
function proto() {
    var args = arguments // minifiable variables

    if(args.length == 1) {
        var parent = {}
        var prototypeBuilder = args[0]

    } else { // length == 2
        var parent = args[0]
        var prototypeBuilder = args[1]
    }

    // special handling for Error objects
    var namePointer = {}
    if([Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError].indexOf(parent) !== -1) {
        parent = normalizeErrorObject(parent, namePointer)
    }

    // set up the parent into the prototype chain if a parent is passed
    var parentIsFunction = typeof(parent) === "function"
    if(parentIsFunction) {
        prototypeBuilder[prototypeName] = parent[prototypeName]
    } else {
        prototypeBuilder[prototypeName] = parent
    }

    // the prototype that will be used to make instances
    var prototype = new prototypeBuilder(parent)
    prototype.constructor = ProtoObjectFactory;    // set the constructor property on the prototype
    namePointer.name = prototype.name

    // if there's no init, assume its inheriting a non-proto class, so default to applying the superclass's constructor.
    if(!prototype[init] && parentIsFunction) {
        prototype[init] = function() {
            parent.apply(this, arguments)
        }
    }

    // constructor for empty object which will be populated via the constructor
    var F = function() {}
        F[prototypeName] = prototype    // set the prototype for created instances

    function ProtoObjectFactory() {     // result object factory
        var x = new F()                 // empty object

        if(prototype[init]) {
            var result = prototype[init].apply(x, arguments)    // populate object via the constructor
            if(result === proto[protoUndefined])
                return undefined
            else if(result !== undefined)
                return result
            else
                return x
        } else {
            return x
        }
    }

    // add all the prototype properties onto the static class as well (so you can access that class when you want to reference superclass properties)
    for(var n in prototype) {
        addProperty(ProtoObjectFactory, prototype, n)
    }

    // add properties from parent that don't exist in the static class object yet (to get thing in like
    for(var n in parent) {
        if(Object.hasOwnProperty.call(parent, n) && ProtoObjectFactory[n] === undefined) {
            addProperty(ProtoObjectFactory, parent, n)
        }
    }

    ProtoObjectFactory[prototypeName] = prototype  // set the prototype on the object factory

    return ProtoObjectFactory;
}

proto[protoUndefined] = {} // a special marker for when you want to return undefined from a constructor

module.exports = proto

function normalizeErrorObject(ErrorObject, namePointer) {
    function NormalizedError() {
        var tmp = new ErrorObject(arguments[0])
        tmp.name = namePointer.name

        this.message = tmp.message
        if(Object.defineProperty) {
            /*this.stack = */Object.defineProperty(this, 'stack', { // getter for more optimizy goodness
                get: function() {
                    return tmp.stack
                }
            })
        } else {
            this.stack = tmp.stack
        }

        return this
    }
        var IntermediateInheritor = function() {}
            IntermediateInheritor.prototype = ErrorObject.prototype
        NormalizedError.prototype = new IntermediateInheritor()
    return NormalizedError
}

function addProperty(factoryObject, prototype, property) {
    try {
        var info = Object.getOwnPropertyDescriptor(prototype, property)
        if(info.get !== undefined || info.get !== undefined && Object.defineProperty !== undefined) {
            Object.defineProperty(factoryObject, property, info)
        } else {
            factoryObject[property] = prototype[property]
        }
    } catch(e) {
        // do nothing, if a property (like `name`) can't be set, just ignore it
    }
}
},{}],6:[function(require,module,exports){
// utilities needed by the configuration (excludes dependencies the configs don't need so the webpack bundle is lean)

var path = require('path')


// Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
// any number of objects can be passed into the function and will be merged into the first argument in order
// returns obj1 (now mutated)
var merge = exports.merge = function(obj1, obj2/*, moreObjects...*/){
    return mergeInternal(arrayify(arguments), false)
}

// like merge, but traverses the whole object tree
// the result is undefined for objects with circular references
var deepMerge = exports.deepMerge = function(obj1, obj2/*, moreObjects...*/) {
    return mergeInternal(arrayify(arguments), true)
}

function mergeInternal(objects, deep) {
    var obj1 = objects[0]
    var obj2 = objects[1]

    for(var key in obj2){
       if(Object.hasOwnProperty.call(obj2, key)) {
            if(deep && obj1[key] instanceof Object && obj2[key] instanceof Object) {
                mergeInternal([obj1[key], obj2[key]], true)
            } else {
                obj1[key] = obj2[key]
            }
       }
    }

    if(objects.length > 2) {
        var newObjects = [obj1].concat(objects.slice(2))
        return mergeInternal(newObjects, deep)
    } else {
        return obj1
    }
}

function arrayify(a) {
    return Array.prototype.slice.call(a, 0)
}

},{"path":3}]},{},[1])(1)
});