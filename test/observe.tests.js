var testUtils = require('./testUtils')

var equal = testUtils.equal

var O = require("../observe")

module.exports = function(t) {







    //*
    this.test('basic methods and events', function(t) {
        this.test("basic set, get, push, append, and splice", function(t) {
            this.count(12)

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

            var splicedValues = subject.get('c').splice(1, 1, 99)
            this.ok(equal(obj.c, [4,99,2,1]), obj.c)
            this.ok(equal(splicedValues, [3]))
        })

        this.test("unset", function(t) {
            this.count(4)

            var subject = {a:1,b:2}
            var obs = O(subject)

            var n = 0
            obs.on('change', function(change) {
                if(n === 0) {
                    t.ok(equal(change, {type:'unset', property: ['a']}), change)
                } else {
                    t.ok(equal(change, {type:'unset', property: ['b']}), change)
                }

                n++
            })

            obs.unset('a')
            t.ok(equal(obs.subject, {b:2}))

            var b = obs.get('b')
            b.unset([])
            t.ok(equal(obs.subject, {}))
        })

        this.test("pop", function() {
            this.test("pop - regular", function(t) {
                this.count(3)

                var subject = [1,2,3]
                var obs = O(subject)

                obs.on('change', function(change) {
                    t.ok(equal(change, {type:'removed', property: [], index:2, removed: [3]}), change)
                })

                t.eq(obs.pop(), 3)
                t.ok(equal(obs.subject, [1,2]))
            })

            this.test("pop - observee child", function(t) {
                this.count(3)

                var subject = {a:[1,2,3]}
                var obs = O(subject).get('a')

                obs.on('change', function(change) {
                    t.ok(equal(change, {type:'removed', property: [], index:2, removed: [3], count:undefined,data:undefined}), change)
                })

                t.eq(obs.pop(), 3)
                t.ok(equal(obs.subject, [1,2]))
            })
        })

        this.test("shift and unshift", function() {
            this.test("regular", function(t) {
                this.count(13)

                var subject = []
                var obs = O(subject)

                var changeSequence = testUtils.sequence()
                obs.on('change', function(change) {
                    changeSequence(function(){
                        t.ok(equal(change, {type: 'added', property:[], index: 0, count:1}), change)
                    },function(){
                        t.ok(equal(change, {type: 'added', property:[], index: 0, count:2}), change)
                    },function() {
                        t.ok(equal(change, {type: 'removed', property:[], index: 0, removed:[3]}), change)
                    },function() {
                        t.ok(equal(change, {type: 'removed', property:[], index: 0, removed:[4]}), change)
                    },function() {
                        t.ok(equal(change, {type: 'removed', property:[], index: 0, removed:[5]}), change)
                    })
                })

                obs.unshift(5)
                t.ok(equal(subject, [5]), subject)

                obs.unshift(3,4)
                t.ok(equal(subject, [3,4,5]), subject)

                t.eq(obs.shift(), 3)
                t.ok(equal(obs.subject, [4,5]), subject)
                t.eq(obs.shift(), 4)
                t.ok(equal(obs.subject, [5]))
                t.eq(obs.shift(), 5)
                t.ok(equal(obs.subject, []))
            })

            this.test("shift and unshift - observee child", function(t) {
                this.count(13)

                var subject = {a:[]}
                var obs = O(subject).get('a')

                var changeSequence = testUtils.sequence()
                obs.on('change', function(change) {
                    changeSequence(function(){
                        t.ok(equal(change, {type: 'added', property:[], index: 0, count:1, removed:undefined,data:undefined}), change)
                    },function(){
                        t.ok(equal(change, {type: 'added', property:[], index: 0, count:2, removed:undefined,data:undefined}), change)
                    },function() {
                        t.ok(equal(change, {type: 'removed', property:[], index: 0, removed:[3], count:undefined,data:undefined}), change)
                    },function() {
                        t.ok(equal(change, {type: 'removed', property:[], index: 0, removed:[4], count:undefined,data:undefined}), change)
                    },function() {
                        t.ok(equal(change, {type: 'removed', property:[], index: 0, removed:[5], count:undefined,data:undefined}), change)
                    })
                })

                obs.unshift(5)
                t.ok(equal(subject.a, [5]), subject.a)

                obs.unshift(3,4)
                t.ok(equal(subject.a, [3,4,5]), subject.a)

                t.eq(obs.shift(), 3)
                t.ok(equal(obs.subject, [4,5]), subject.a)
                t.eq(obs.shift(), 4)
                t.ok(equal(obs.subject, [5]))
                t.eq(obs.shift(), 5)
                t.ok(equal(obs.subject, []))
            })
        })

        this.test("reverse", function() {
            this.test("regular", function(t) {
                this.count(2)

                var subject = [1,2,3]
                var obs = O(subject)

                obs.on('change', function(change) {
                    t.ok(equal(change, {type:'set', property: []}), change)
                })

                obs.reverse()
                t.ok(equal(subject, [3,2,1]))
            })
            this.test("reverse - observee child", function(t) {
                this.count(2)

                var subject = {a:[1,2,3]}
                var obs = O(subject).get('a')

                obs.on('change', function(change) {
                    t.ok(equal(change, {type:'set', property: []}), change)
                })

                obs.reverse()
                t.ok(equal(subject.a, [3,2,1]))
            })
        })

        this.test("sort", function() {
            this.test("regular", function(t) {
                this.count(4)

                var subject = [1,3,2]
                var obs = O(subject)

                var changeSequence = testUtils.sequence()
                obs.on('change', function(change) {
                    changeSequence(function(){
                        t.ok(equal(change, {type:'set', property: []}), change)
                    },function(){
                        t.ok(equal(change, {type:'set', property: []}), change)
                    })
                })

                obs.sort(function(a,b) {
                    return b-a // reverse sort
                })
                t.ok(equal(subject, [3,2,1]))

                obs.sort()
                t.ok(equal(subject, [1,2,3]))
            })
            this.test("sort - observee child", function(t) {
                this.count(4)

                var subject = {a:[1,2,3]}
                var obs = O(subject).get('a')

                var changeSequence = testUtils.sequence()
                obs.on('change', function(change) {
                    changeSequence(function(){
                        t.ok(equal(change, {type:'set', property: []}), change)
                    },function(){
                        t.ok(equal(change, {type:'set', property: []}), change)
                    })
                })

                obs.sort(function(a,b) {
                    return b-a // reverse sort
                })
                t.ok(equal(subject.a, [3,2,1]))

                obs.sort()
                t.ok(equal(subject.a, [1,2,3]))
            })
        })

//
//**`observer.reverse()`** - Emits a `"set"` change event.
    });

    this.test('array stuff', function(t) {
        this.count(10)

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

        var splicedValues = subject.splice(1,2,'moo')
        this.ok(equal(array, [3,'moo',6]))
        this.ok(equal(splicedValues, [4,5]))

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
            t.ok(equal(change, {type:'set', property: ['b'], index: undefined, count:undefined, removed: undefined, data: undefined}), change)
        })

        subject.set('a.b', 5)
        subSubject.set('b', 6)
    })

    this.test('get - complex', function(t) {
        this.count(12)

        var obj = {a:[{b:1}]}
        var subject = O(obj)
        var subSubject = subject.get('a.0.b')

        var subjectSequence = testUtils.sequence()
        subject.on('change', function(change) {
            subjectSequence(function(){
                t.ok(equal(change, {type:'set', property: ['a','0','b']}), change)
                t.eq(subject.subject.a[0].b, 2)
                t.eq(subSubject.subject, 2)
            }, function() {
                t.ok(equal(change, {type:'set', property: ['a','0','b']}), change)
                t.eq(subject.subject.a[0].b, 3)
                t.eq(subSubject.subject, 3)
            })
        })

        var subSubjectSequence = testUtils.sequence()
        subSubject.on('change', function(change) {
            subSubjectSequence(function(){
                t.ok(equal(change, {type:'set', property: []}), change)
                t.eq(subject.subject.a[0].b, 2)
                t.eq(subSubject.subject, 2)
            }, function() {
                t.ok(equal(change, {type:'set', property: []}), change)
                t.eq(subject.subject.a[0].b, 3)
                t.eq(subSubject.subject, 3)
            })
        })

        subject.set('a.0.b', 2)
        subSubject.set([], 3)
    })

    // deprecated
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
    this.test('data', function(t) {
        this.count(8)

        var obj = {}
        var observee = O(obj)

        var changeSequence = testUtils.sequence()
        observee.on('change', function(change) {
            changeSequence(function(){
                t.eq(change.data, 1)
            },function(){
                t.eq(change.data, 2)
            },function(){
                t.eq(change.data, 3)
                t.ok(equal(change.property, ['a','1']), change.property)
            })
        })
        var changeSequenceA = testUtils.sequence()
        observee.get('a').on('change', function(change) {
            changeSequenceA(function(){
                t.eq(change.data, 1)
            },function(){
                t.eq(change.data, 2)
            },function(){
                t.eq(change.data, 3)
                t.ok(equal(change.property, ['1']), change.property)
            })
        })

        observee.data(1).set('a', [])
        observee.get('a').data(2).push(3)
        observee.get('a').data(3).set(1, 4)
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

    // testing the demo in the readme
    this.test("demo", function(t) {
        this.count(13)
        var observe = O

        var eventSequence = testUtils.sequence()
        var event = function(event) {
            eventSequence(function() {
                t.eq(event, "My 'a' property changed to: 2.")
                t.eq(object.a, 2)
            },function() {
                t.eq(event, "FINALLY someone sets my b.x property!")
                t.eq(object.b.x, 'hi')
                t.eq(Object.keys(object.b).length, 1)
            },function() {
                t.eq(event, "My c property got 2 new values: 3,4.")
                t.ok(equal(object.c, [3,4]))
            },function() {
                t.eq(event, "Someone took 3 from c!")
                t.ok(equal(object.c, [4]))
            },function() {
                t.eq(event, "Well i just don't know *what's* going on with b.y.")
                t.eq(object.b.y, 'ho')
            },function() {
                t.eq(event, "My c property got 3 new values: 5,6,7.")
                t.ok(equal(object.c, [4,5,6,7]))
            })
        }

        // demo starts here

        var object = {a:1, b:{}, c:[]}
        var observer = observe(object)

        observer.on('change', function(change) {
           if(change.property[0] === 'a') {
              event("My 'a' property changed to: "+observer.subject.a + '.')
           } else if(change.property[0] === 'b' && change.property[1] === 'x') {
              event("FINALLY someone sets my b.x property!")
           } else if(change.property[0] === 'c' && change.type === 'added') {
              var s = change.count>1 ? 's' : '' // plural
              event("My c property got "+change.count+" new value"+s+": "+observer.subject.c.slice(change.index, change.index+change.count) +'.')
           } else if(change.property[0] === 'c' && change.type === 'removed') {
              var s = change.count>1 ? 's' : '' // plural
              event("Someone took "+change.removed+" from c!")
           } else {
              event("Well i just don't know *what's* going on with "+change.property.join('.') +".")
           }
        })

        observer.set('a', 2)             // prints "My 'a' property changed to: 2."
        observer.set('b.x', 'hi')        // prints "FINALLY someone sets my b.x property!"
        observer.get('c').push(3, 4)     // prints "My c property got 2 new values: 3,4."
        observer.get('c').splice(0,1)    // prints "Someone took 3 from c!"
        observer.set('b.y', 'ho')        // prints "Well i just don't know *what's* going on with b.y."
        observer.get('c').append([5,6,7])// prints "My c property got 3 new values: 5,6,7."
    })

    this.test("errors", function() {
        this.test("setting top level should throw an exception", function() {
            this.count(1)

            var x = O([1,2,3])

            try {
                x.set([], 3)
            } catch(e) {
                this.eq(e.message, "You can't set at the top-level, setting like that only works for ObserveeChild (sub-observees created with 'get')")
            }
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

        this.test("ObserveeChild splice doesn't return the spliced values", function(t) {
            var a = [{x:1},{x:2}]
            var oa = O(a)

            var one = oa.get(1)

            oa.splice(0,1)
            one.set('x',3)
            this.eq(a[0].x, 3)
        })

        this.test("inner unioned observees didn't get their change event fired when containing observee changed it", function(t) {
            this.count(8)

            var a = [], b = {x:1}, c={moo:1}
            var oa = O(a), ob = O(b), oc=O(c)

            ob.on('change', function(change) {
                t.eq(change.property.length, 1)
                t.eq(change.property[0], 'x')
                t.eq(change.type, 'set')
                t.eq(b.x, 2)
            })
            oc.on('change', function(change) {
                t.eq(change.property.length, 1)
                t.eq(change.property[0], 'moo')
                t.eq(change.type, 'set')
                t.eq(c.moo, 3)
            })

            oa.union().push(ob)
            oa.union(true).push(oc)

            oa.set("0.subject.x", 2)
            oa.set("1.moo", 3)
        })

        this.test("ids weren't working when chained after a 'get'", function(t) {
            var a = {b:{c:{d:3}}}
            var oa = O(a)

            oa.on('change', function(change) {
                t.eq(change.id, 'whatever')
                t.eq(change.type, 'set')
                t.eq(a.b.c.d, 4)
            })

            var x = oa.get('b.c').id('whatever') // was causing an exception
            x.set('d', 4)
        })

        this.test("events weren't working when you used get with child property", function (t) {
            this.count(1)

            var a = O({a:[]})
            var thing = a.get("a")
            thing.on('change', function() {
                t.ok(true)
            })
            thing.push(3)
        })

        this.test("ObserveeChild exception when that child is removed", function (t) {
            var a = O([{x:1}])
            var thing = a.get("0.x")
            a.splice(0,1)
        })

        this.test("ObserveeChild exception after that child is removed and then a sibling value is set", function (t) {
            var a = O([{x:1},{x:2}])
            var thing = a.get("1.x")
            a.splice(1,1)
            a.set('0.x', 2)
        })

        this.test("ObserveeChild not pointing to correct subject after inserts at it index", function (t) {
            this.count(1)

            var a = O([1,2])
            var thing = a.get("1")
            thing.on('change', function(change) {
                t.eq(thing.subject,2.1)
            })

            a.splice(1,0,1.5)
            a.set(2, 2.1)
        })

        this.test("ObserveeChild change wasn't getting triggered for arrays after elements have been shifted via a splice", function(t) {
           this.count(1)

            var a = O([[3,4]])
            var thing = a.get(0)
            a.splice(0, 0, [1,2])

            thing.on('change', function(change) {
                t.eq(thing.subject[0], 3)
            })

            thing.splice(1,1)
        })

        this.test("ObserveeChild for inner properties 4 or more properties deep causes exception if the outer object is reset", function() {
            var x = O({
                a: {b: {c: {d:{}}}}
            })

            var y = x.get('a.b.c.d')

            x.set('a', 1) // was causing an exception
        })

        this.test("ObserveeChild could be in an invalid state when 'get' is called on its parent", function(t) {
            var x = O([{a:1}, {a:2}])

            x.on('change', function() {
                t.eq(first.get('a').subject, 1)
            })

            var first = x.get(0)
            x.splice(0, 0, {a:0}) // was causing an exception
        })

        this.test("ObserveeChild wasn't getting its parent's options", function(t) {
            var x = O([{a:1}, {a:2}])
            var xi = x.data({hi:1})
            var y = xi.get(0)

            y.on('change', function(change) {
                t.eq(change.data.hi, 1)
            })

            y.set('a', 8)
        })

        // todo: consider fixing this - not entirely sure it is a "problem" to be "fixed" tho
        // this.test("event handlers were being executed out of order when ObserveeChild is being used", function() {
        //     var x = O([{a:1}, {a:2}])
        //
        //     var step = 0
        //     x.on('change', function() {
        //         step++
        //         t.eq(step, 1)
        //     })
        //     x.get('0.a', function() {
        //         step++
        //         t.eq(step, 2)
        //     })
        //
        //     x.set('0.a', 9)
        // })
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
