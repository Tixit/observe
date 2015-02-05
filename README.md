`observe`
============

A powerful, pragmatic implementation of the observer pattern for javascript objects and arrays.

Examples
=======

```javascript
var observe = require('observe')

var object = {a:1, b:{}, c:[]}
var observer = observe(object)

observer.on('change', function(change) {
   if(change.property[0] === 'a') {
      console.log("My 'a' property changed to: "+observer.subject.a + '.')
   } else if(change.property[0] === 'b' && change.property[1] === 'x') {
      console.log("FINALLY someone sets my b.x property!")
   } else if(change.property[0] === 'c' change.type === 'added') {
      var s = change.count>1 ? 's' : '' // plural
      console.log("My c property got "+change.count+" new value"+s+": "+observer.subject.slice(change.index, change.count) +'.'
   } else if(change.property[0] === 'c' change.type === 'removed') {
      var s = change.count>1 ? 's' : '' // plural
      console.log("Someone took "+change.removed+" from c!")
   } else {
      console.log("Well i just don't know *what's* going on with "+change.property.join('.') +".")
   }
})

observer.set('a', 2)             // prints "My 'a' property changed to: 2."
observer.set('b.x', 'hi')        // prints "FINALLY someone sets my b.c property!"
observer.get('c').push(3, 4)     // prints "My c property got 2 new values: 3,4."
observer.get('c').splice(0,1)    // prints "Someone took 3 from c!"
observer.set('b.y', 'ho')        // prints "Well i just don't know *what's* going on with b.y."
observer.get('c').append([5,6,7])// prints "My c property got 3 new values: 5,6,7."

```

Why not use `Object.observe`?
=====================
`Object.observe` is fantastic - if you live in the future! Attempts at polyfilling this simply aren't practicle, because they have to use polling. Since this won't be practically usable until ECMAScript 7 is widespread, this module will do what you need almost as elegantly. Also, `Object.observe` doesn't have the `id` feature (see below).

Install
=======

```
npm install observe
```

or download the built package generatedBuilds/observe.umd.js from the repository and include it in a &lt;script> tag.

Usage
=====

```javascript
var Future = require('observe')  // node-js and webpack

define(['observe'], function(observe) { ... } // amd

observe; // proto.global.js defines proto globally
       // if you really  want to shun module-based design
```


`var observer = observe(obj)` - returns an observer object, which is an instance of [node.js's EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter). The `obj` argument can be any `Object` or `Array`. Note that even though this uses node.js's EventEmitter, it still works in the browser.

`observer.subject` - the object being observed (same as the `obj` passed in)

`observer.set(property, value)` - Sets a value on the observer's subject and emits a `"set"` change event.
* `property` - The propety to set, in dot notation (see below).
* `value` - The value to set on that property.

`observer.push(...)` - Your standard javascript `push` method. Also emits an `"added" change event.

`observer.splice(...)` - Your standard javascript `splice` method. Can emit a `"removed"` change event, then an `"added"` change event (only emits both if values are both added *and* removed).

`observer.append(...)` - Slightly optimized shorthand for `observer.slice(observer.subject.length,0,...)`.

`observer.get(property)` - Returns a new observer for a property within the observer's subject. Any changes done to the returned observer will trigger events on the calling observer, but you can also set up an event listener on the returned observer.
* `property` - The propety to get an observer for, in dot notation (see below).

`observer.id(value)` - Returns a new observer that will include the passed value as the `id` property in change events caused by that observer. This can be useful if you need to ignore a change event in certain handlers but not other, or if you need to pass additional information. For example:

```javascript
var observer = observer({})

var ignoreA = {}
observer.on('change', function(change) {
   if(id !== ignoreA) {
      console.log("A")
   }
})

var ignoreB = {}
observer.on('change', function(change) { // somewhere else...
   if(id !== ignoreB) {
      console.log("B")
   }
})

observer.id(ignoreA).set('a', 1)  // prints "B", but not "A"

```

`observer.union(collapse)` - Returns an observer object for which any property added via set, push, splice, or append joins an internal observee together with this observee, so that the internal observee and the containing observee will both send 'change' events appropriately.
* `collapse` - (default: false) If true, any property added will be set to the subject of the value added (so that value won't be an observee anymore). Note: only use collapse:true if the observees you're unioning isn't actually an object that inherits from an observee - any instance methods on the observee that come from child classes won't be accessible anymore.

Example:

```
var x = observe({a:5})
var b = observe({})
x.subject.a === 5    ;; true
b.union(true).set('x', x)
b.subject.x.a === 5            ;; true
b.subject.x.subject.a === 5    ;; false
```

Dot notation
------------

The properties passed into `get` and `set` are passed in dot notation. Array indexes can also be passed with dot notation. That means that passing "a.b.c" refers to `observer.subject.a.b.c` and "a.3.x" refers to `observer.subject.a[3].x`.

Change Event
---------

The change event comes through whenever an observer is used to `set`, `push`, or `splice` its subject. Listen to the `change` event using `observer.on` or any of the other standard [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) methods. The event has the following properties:

* `type` - Either `"set"` (for value changes), `"added"` (for values added to an array), or `"removed"` (for values removed from an array).
* `property` - An array of property parts. For example, the property "observer.subject.a.b.c" will be represented as `['a','b','c']` and the property "observer.subject.a[3].x" will be represented as `['a','3','x']
* `index` - The array index at which values were added or removed. Only exists for `"added"` and `"removed"` events.
* `count` - The number of elements added. Only exists for `"added"` events.
* `values` - The list of values removed from an array. Only exists for `"removed"` events.


Changelog
========

* 1.0.0 - Initial commit - code transferred from private project.

How to Contribute!
============

Anything helps:

* Creating issues (aka tickets/bugs/etc). Please feel free to use issues to report bugs, request features, and discuss changes
* Updating the documentation: ie this readme file. Be bold! Help create amazing documentation!
* Submitting pull requests.

How to submit pull requests:

1. Please create an issue and get my input before spending too much time creating a feature. Work with me to ensure your feature or addition is optimal and fits with the purpose of the project.
2. Fork the repository
3. clone your forked repo onto your machine and run `npm install` at its root
4. If you're gonna work on multiple separate things, its best to create a separate branch for each of them
5. edit!
6. If it's a code change, please add to the unit tests (at test/observer.tests.js) to verify that your change
7. When you're done, run the unit tests and ensure they all pass
8. Commit and push your changes
9. Submit a pull request: https://help.github.com/articles/creating-a-pull-request

License
=======
Released under the MIT license: http://opensource.org/licenses/MIT
