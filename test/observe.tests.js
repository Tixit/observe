var testUtils = require('./testUtils')

var equal = testUtils.equal

var O = require("../observe")

module.exports = function(t) {


    //*
    this.test('basic methods and events', function(t) {
        this.count(11)

        var obj = {a: 1, b:{}, c:[]}
        var subject = O(obj)

        var changeSequence = testUtils.sequence()
        subject.on('change', function(change) {
            changeSequence(function(){
                t.ok(equal(change, {type: 'set', property:['a']}), change)
            },function(){
                t.ok(equal(change, {type: 'set', property:['b', 'x']}), change)
            },function(){
                t.ok(equal(change, {type: 'added', property:['c'], index: 0, count:1}), change)
            },function(){
                t.ok(equal(change, {type: 'added', property:['c'], index: 1, count:3}), change)
            },function() {
                t.ok(equal(change, {type: 'removed', property:['c'], index: 1, removed:[3]}), change)
            }, function() {
                t.ok(equal(change, {type: 'added', property:['c'], index: 1, count:1}), change)
            })
        })

        subject.set('a', 5)
        this.eq(obj.a, 5)

        subject.set('b.x', 12)
        this.eq(obj.b.x, 12)

        subject.get('c').push(4)
        this.ok(equal(obj.c, [4]))

        subject.get('c').append([3,2,1])
        this.ok(equal(obj.c, [4,3,2,1]))

        subject.get('c').splice(1, 1, 99)
        this.ok(equal(obj.c, [4,99,2,1]), obj.c)
    });

    this.test('array stuff', function(t) {
        var array = []
        var subject = O(array)

        var changeSequence = testUtils.sequence()
        subject.on('change', function(change) {
            changeSequence(function(){
                t.ok(equal(change, {type: 'added', property:[], index: 0, count: 1}), change)
            },function(){
                t.ok(equal(change, {type: 'set', property:['0']}), change)
            },function(){
                t.ok(equal(change, {type: 'added', property:[], index: 1, count:3}), change)
            },function(){
                t.ok(equal(change, {type: 'removed', property:[], index: 1, removed:[4,5]}), change)
            }, function() {
                t.ok(equal(change, {type: 'added', property:[], index: 1, count:1}), change)
            })
        })

        subject.push(1) // shouldn't need to pass the property for access to the top-level object
        this.ok(equal(array, [1]))

        subject.set(0, 3)
        this.ok(equal(array, [3]))

        subject.append([4,5,6])
        this.ok(equal(array, [3,4,5,6]))

        subject.splice(1,2,'moo')
        this.ok(equal(array, [3,'moo',6]))
    })


    this.test('get', function(t) {
        this.count(4)

        var obj = {a:{}}
        var subject = O(obj)
        var subSubject = subject.get('a')

        subject.on('change', function(change) {
            t.ok(equal(change, {type:'set', property: ['a', 'b']}), change)
        })
        subSubject.on('change', function(change) {
            t.ok(equal(change, {type:'set', property: ['b'], index: undefined, count:undefined, removed: undefined}), change)
        })

        subject.set('a.b', 5)
        subSubject.set('b', 6)
    })


    this.test('id', function(t) {
        this.count(4)

        var obj = {}
        var observee = O(obj)

        var changeSequence = testUtils.sequence()
        observee.on('change', function(change) {
            changeSequence(function(){
                t.eq(change.id, 1)
            },function(){
                t.eq(change.id, 2)
            },function(){
                t.eq(change.id, 3)
                t.ok(equal(change.property, ['a','1']), change.property)
            })
        })

        observee.id(1).set('a', [])
        observee.get('a').id(2).push(3)
        observee.get('a').id(3).set(1, 4)
    })


    this.test('union', function(t) {
        this.test('collapse', function(t) {
            this.count(27)

            var a = {}, b = {x:5, ra: []}
            var oa = O(a), ob = O(b)

            oa.union(true).set('b', ob)

            this.eq(oa.subject.b.x, 5)
            this.eq(oa.get('b.x').subject, 5)

            var changeSequenceA = testUtils.sequence()
            oa.on('change', function(change) {
                changeSequenceA(
                // set
                function(){
                    t.ok(equal(change, {type:'set', property: ['b', 'x']}), change)
                }, function(){
                    t.ok(equal(change, {type:'set', property: ['b', 'x']}), change)
                }, function(){
                    t.ok(equal(change, {type:'set', property: ['b', 'x']}), change)

                // push
                }, function(){
                    t.ok(equal(change, {type: 'added', property: ['b', 'ra'], index: 0, count:1}), change)
                }, function(){
                    t.ok(equal(change, {type: 'added', property: ['b', 'ra'], index: 1, count:1}), change)

                // splice
                }, function() {
                    t.ok(equal(change, {type: 'removed', property:['b', 'ra'], index: 0, removed:['moo']}), change)
                }, function(){
                    t.ok(equal(change, {type: 'added', property: ['b', 'ra'], index: 0, count:4}), change)
                }, function() {
                    t.ok(equal(change, {type: 'removed', property:['b', 'ra'], index: 0, removed:['kiss', 'from', 'a', 'ro']}), change)
                }, function(){
                    t.ok(equal(change, {type: 'added', property: ['b', 'ra'], index: 0, count:1}), change)

                // append
                }, function() {
                    t.ok(equal(change, {type: 'added', property: ['b', 'ra'], index: 2, count:1}), change)
                }, function() {
                    t.ok(equal(change, {type: 'added', property: ['b', 'ra'], index: 3, count:1}), change)

                // replace property b
                }, function() {
                    t.ok(equal(change, {type: 'set', property: ['b']}), change)

                // after disunion
                }, function() {
                    t.ok(equal(change, {type:'set', property: ['b', 'y']}), change)
                })
            })
            var changeSequenceB = testUtils.sequence()
            ob.on('change', function(change) {
                changeSequenceB(
                // set
                function(){
                    t.ok(equal(change, {type:'set', property: ['x']}), change)
                }, function(){
                    t.ok(equal(change, {type:'set', property: ['x']}), change)
                }, function(){
                    t.ok(equal(change, {type:'set', property: ['x']}), change)

                // push
                }, function(){
                    t.ok(equal(change, {type: 'added', property: ['ra'], index: 0, count:1}), change)
                }, function(){
                    t.ok(equal(change, {type: 'added', property: ['ra'], index: 1, count:1}), change)

                // splice
                }, function() {
                    t.ok(equal(change, {type: 'removed', property:['ra'], index: 0, removed:['moo']}), change)
                }, function(){
                    t.ok(equal(change, {type: 'added', property: ['ra'], index: 0, count:4}), change)
                }, function() {
                    t.ok(equal(change, {type: 'removed', property:['ra'], index: 0, removed:['kiss', 'from', 'a', 'ro']}), change)
                }, function(){
                    t.ok(equal(change, {type: 'added', property: ['ra'], index: 0, count:1}), change)

                // append
                }, function() {
                    t.ok(equal(change, {type: 'added', property: ['ra'], index: 2, count:1}), change)
                }, function() {
                    t.ok(equal(change, {type: 'added', property: ['ra'], index: 3, count:1}), change)

                // after disunion
                }, function() {
                    t.ok(equal(change, {type:'set', property: ['z']}), change)
                })
            })

            oa.set('b.x', 10)
            ob.set('x', 11)
            oa.get('b').set('x', 12)

            oa.get('b.ra').push('moo')
            ob.get('ra').push('se')

            oa.get('b.ra').splice(0, 1, 'kiss', 'from', 'a', 'ro')
            ob.get('ra').splice(0, 4, 'goo')

            oa.get('b.ra').append(['bumps'])
            ob.get('ra').append(['blahewaifhew'])

            oa.set('b', {})   // remove b from a
            oa.set('b.y', 13) // should only trigger oa's change event
            ob.set('z', 14)   // should only trigger ob's change event
        })

        this.test("don't collapse", function(t) {
            this.count(5)

            var a = {}, b = {x:5, ra: []}
            var oa = O(a), ob = O(b)

            oa.union(false).set('b', ob)

            this.eq(oa.subject.b.subject.x, 5)

            var changeSequenceA = testUtils.sequence()
            oa.on('change', function(change) {
                changeSequenceA(function() {
                    t.ok(equal(change, {type:'set', property: ['b', 'subject', 'x']}), change)
                },function() {
                    t.ok(equal(change, {type:'set', property: ['b', 'subject', 'x']}), change)
                })
            })
            var changeSequenceB = testUtils.sequence()
            ob.on('change', function(change) {
                changeSequenceB(function() {
                    t.ok(equal(change, {type:'set', property: ['x']}), change)
                },function() {
                    t.ok(equal(change, {type:'set', property: ['x']}), change)
                })
            })

            oa.set('b.subject.x', 11)
            ob.set('x', 12)

        })

    })

    this.test('former bugs', function() {
        this.test("union push on array with 1 or more elements didn't correctly setup change event handlers", function(t) {
            this.count(2)

            var a = {}, b = {x: [1,2,3]}
            var oa = O(a), ob = O(b)

            oa.union(true).set('b', ob)
            oa.on('change', function(change) {
                t.ok(equal(change, {type: 'added', property: ['b','x'], index: 3, count:1}), change)
            })
            ob.on('change', function(change) {
                t.ok(equal(change, {type: 'added', property: ['x'], index: 3, count:1}), change)
            })

            ob.get('x').push(4)
        })

        this.test("maintaining correct union relationship when a containing list has elements being moved around", function(t) {
            this.count(6)

            var a = [1,2], b = {x:1}
            var oa = O(a), ob = O(b)

            oa.union(true).push(ob)

            var changeSequenceA = testUtils.sequence()
            oa.on('change', function(change) {
                changeSequenceA(function() {
                    t.ok(equal(change, {type: 'removed', property: [], index: 0, removed:[1]}), change)
                },function() {
                    t.ok(equal(change, {type: 'set', property: [1,'x']}), change)
                },function() {
                    t.ok(equal(change, {type: 'added', property: [], index: 0, count:1}), change)
                },function() {
                    t.ok(equal(change, {type: 'set', property: [2,'x']}), change)
                })
            })
            var changeSequenceB = testUtils.sequence()
            ob.on('change', function(change) {
                changeSequenceB(function() {
                    t.ok(equal(change, {type: 'set', property: ['x']}), change)
                },function() {
                    t.ok(equal(change, {type: 'set', property: ['x']}), change)
                })
            })

            oa.splice(0,1)
            ob.set('x',4)

            oa.splice(0,0,5)
            ob.set('x',6)
        })

        this.test("ObserveeChild fails if the property changes location in the parent", function(t) {
            var a = [{x:1},{x:2}]
            var oa = O(a)

            var one = oa.get(1)

            oa.splice(0,1)
            one.set('x',3)
            this.eq(a[0].x, 3)
        })

    })

    //*/

    /*this.test('pause and unpause', function(t) {
        this.count(3)

        var obj = {b:[]}
        var subject = O(obj)

        subject.on('change', function(changes) {
            t.ok(equal(changes, [
                {type: 'set', property:['a']},
                {type: 'added', property: ['b'], index:0, count:1},
                {type: 'added', property: ['b'], index:1, count:2},
                {type: 'removed', property: ['b'], index:0, count:1},
                {type: 'added', property: ['b'], index:0, count:2}
            ]), changes)
        })

        subject.pause()
        subject.set('a', 5)
        subject.push('b', 1)
        subject.append('b', [2,3])
        subject.splice('b', 0,1,22,23)
        subject.unpause()

        this.eq(obj.a, 5)
        this.ok(equal(obj.b, [22,23,2,3]), obj.b)
    })*/

    /* actually, it wouldn't be easy to make this work - a hashmap would be needed that would basically cause a memory leak
    this.test('multiple observee objects', function() {
        this.count(2)

        var obj = {}
        var subject1 = O(obj)
        var subject2 = O(obj)

        subject1.on('change', function() {
            t.ok(equal(changes.set, [['a']]))
        })

        subject2.set('a', 4)
        this.eq(obj.a, 4)
    })
    */


}
