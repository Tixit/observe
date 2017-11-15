!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self);var f=o;f=f.observe||(f.observe={}),f=f.test||(f.test={}),f.browser=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var Unit = require('deadunit/deadunit.browser')
var tests = require('./observe.tests')

Unit.test("Testing observe", tests).writeHtml()


},{"./observe.tests":50,"deadunit/deadunit.browser":14}],2:[function(require,module,exports){
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
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(require,module,exports){
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
},{"_process":5}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
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

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],8:[function(require,module,exports){
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

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],9:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":7,"./encode":8}],10:[function(require,module,exports){
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

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":6,"querystring":9}],11:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],12:[function(require,module,exports){
(function (process,global){
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

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":11,"_process":5,"inherits":3}],13:[function(require,module,exports){
(function (process){
var Future = require('async-future')

// built in test formatting helper
module.exports = function(unitTest, printOnTheFly/*, [consoleColors,] format*/) {
    if(arguments.length === 3) {
        var format = arguments[2]
    } else /* if(arguments.length > 3) */{
        var color = arguments[2]
        var format = arguments[3]
    }

    var dotText = '.'
    if(color !== undefined) {
        dotText = color.green('.')
    }

    var result = new Future

    var lastPrintWasDot = false
    var printDot = function(dot) {
        if(dot) {
            process.stdout.write(dotText)
        } else if(lastPrintWasDot) {
            process.stdout.write('\n')
        }

        lastPrintWasDot = dot
    }

    var ended = false
    var events = {
        end: function(e) {
            ended = true
            if(printOnTheFly) printDot(false)

            var results = unitTest.results()
            result.return(formatGroup(results, format, 0).result)

            if(format.end !== undefined)
                format.end()
        }
    }

    if(printOnTheFly) {
        var groups = {}
        events.assert = function(e) {
            printDot(e.success && !ended)
            if(e.success) {
                groups[e.parent].testSuccesses++
                groups[e.parent].assertSuccesses++
            } else {
                groups[e.parent].testFailures++
                groups[e.parent].assertFailures++
            }

            if(!e.success || ended) {
                console.log(format.assert(e, undefined, true))
            }
        }
        events.exception = function(e) {
            printDot(false)
            groups[e.parent].exceptions++

            console.log(format.exception(e.error, true))
        }
        events.log = function(e) {
            printDot(false)
            console.log(format.log(e.values, true))
        }
        events.group = function(g) {
            groups[g.id] = {parent: g.parent, name: g.name, testSuccesses: 0, testFailures: 0, assertSuccesses: 0, assertFailures: 0, exceptions: 0}
        }
        events.groupEnd = function(g) {
            var parent = groups[g.id].parent
            if(parent !== undefined) {
                printDot(false)
                if(groups[g.id].testFailures === 0 && groups[g.id].assertFailures === 0 && groups[g.id].exceptions === 0) {
                    groups[parent].testSuccesses++
                } else {
                    groups[parent].testFailures++
                }

                console.log(format.group(groups[g.id].name, undefined, groups[g.id].testSuccesses,groups[g.id].testFailures,groups[g.id].assertSuccesses,groups[g.id].assertFailures,
                                        groups[g.id].exceptions, [], [], 1, false, true))
            }
        }
    }

    unitTest.events(events)

    return result
}

function formatGroup(testResults, format, nestingLevel) {
    var assertSuccesses = 0
    var assertFailures = 0
    var exceptions = 0

    var testCaseSuccesses= 0, testCaseFailures=0;

    var results = []
    testResults.results.forEach(function(result) {
        if(result.type === 'assert') {
            if(result.success) {
                testCaseSuccesses++
                assertSuccesses ++
            } else {
                testCaseFailures++
                assertFailures++
            }

            results.push(format.assert(result, testResults.name, false))

        } else if(result.type === 'group') {
            var group = formatGroup(result, format, nestingLevel+1)
            exceptions+= group.exceptions

            if(group.failures === 0 && group.exceptions === 0)
                testCaseSuccesses++
            else
                testCaseFailures++

            results.push(group.result)
            assertSuccesses+= group.assertSuccesses
            assertFailures+= group.assertFailures

        } else if(result.type === 'log') {
            results.push(format.log(result.values, false))
        } else {
            throw new Error("Unknown result type: "+result.type)
        }
    })

    var exceptionResults = []
    testResults.exceptions.forEach(function(e) {
        exceptionResults.push(format.exception(e, false))
    })

    exceptions+= testResults.exceptions.length

    var formattedGroup = format.group(testResults.name, testResults.duration,
                                      testCaseSuccesses, testCaseFailures,
                                      assertSuccesses, assertFailures, exceptions,
                                      results, exceptionResults, nestingLevel, testResults.timeout, false)
    return {result: formattedGroup,
            successes: testCaseSuccesses,
            failures: testCaseFailures,
            assertSuccesses: assertSuccesses,
            assertFailures: assertFailures,
            exceptions: exceptions
    }
}


}).call(this,require('_process'))
},{"_process":5,"async-future":18}],14:[function(require,module,exports){
"use strict";
/* Copyright (c) 2014 Billy Tetrud - Free to use for any purpose: MIT License*/

var deadunitInternal = require("./deadunit.internal")
var Future = require('async-future')

module.exports = deadunitInternal({
    deadunitCore: require('deadunit-core/deadunitCore.browser'),

    environmentSpecificMethods: function() {
        var red = 'rgb(200,30,30)'

        var warningWritten = false
        function warnAboutLateEvents(domNode) {
            if(!warningWritten) {
                append(domNode, "Test results were accessed before asynchronous parts of tests were fully complete.", {style: "color: red;"})
                warningWritten = true
            }
        }

        function writeLateEvent(written, ended, domNode, event, manager) {
            if(ended) {
                written.then(function() {
                    warnAboutLateEvents(domNode)
                    append(domNode, JSON.stringify(event), {style: "color: red;"})
                })
            }
        }

        // writes html on the current (browser) page
        this.writeHtml = function(domNode) {
            if(domNode === undefined) domNode = document.body

            var f = new Future, test = this, ended = false, written = new Future
            test.events({
                end: function() {
                    ended = true
                    test.html(false).then(function(output) {
                        append(domNode, output)
                        written.return()
                        f.return()
                    })
                },

                assert: function(event) {
                    writeLateEvent(written, ended, domNode, event, test.manager)
                },
                exception: function(event) {
                    writeLateEvent(written, ended, domNode, event, test.manager)
                },
                log: function(event) {
                    writeLateEvent(written, ended, domNode, event, test.manager, event.parent, event.time)
                }
            })
            return f
        }

    }
})

function append(domNode, content, attributes) {
    if(domNode.setAttributeNode === undefined || domNode.appendChild === undefined)
        console.log("Object that is not a dom node passed to 'append' (jquery objects aren't supported anymore): "+domNode)
    if(attributes ===  undefined) attributes = {}

    /*var div = document.createElement('div')
        div.innerHTML = content
    for(var attribute in attributes) {
        var a = document.createAttribute(attribute)
            a.nodeValue = attributes[attribute]
        domNode.setAttributeNode(a);
    }

    domNode.appendChild(div)
    */
    $(domNode).append(content)
}
},{"./deadunit.internal":15,"async-future":18,"deadunit-core/deadunitCore.browser":20}],15:[function(require,module,exports){
"use strict";
/* Copyright (c) 2013 Billy Tetrud - Free to use for any purpose: MIT License*/

module.exports = function(options) {
    var exports = {}

    var deadunitCore = options.deadunitCore
    var proto = require('proto')

    var defaultFormats = require('./defaultFormats')
    exports.format = require('./basicFormatter')

    exports.error = deadunitCore.error

    exports.test = proto(deadunitCore.test, function() {
        this.string = function() {
            return defaultFormats.text(this, undefined, /*printOnTheFly=*/false, /*printLateEvents=*/false)
        }

        this.html = function() {
            return defaultFormats.html(this, false)
        }

        this.results = function() {
            arguments[0] = false
            return deadunitCore.test.results.apply(this, arguments)
        }

        options.environmentSpecificMethods.call(this)
    })

    return exports
}


},{"./basicFormatter":13,"./defaultFormats":16,"proto":47}],16:[function(require,module,exports){
var util = require("util")

var Future = require('async-future')

var formatBasic = require("./basicFormatter")
var indent = require("./indent")

// unitTest is a deadunit-core UnitTest object
// if consoleColoring is true, the string will contain console color annotations
// if printOnTheFly is true, test results will be printed to the screen in addition to being returned
// returns a future containing a string with the final results
exports.text = function textOutput(unitTest, consoleColors, printOnTheFly, printLateEvents) {
    if(printLateEvents === undefined) printLateEvents = true

    function color(theColor, theString) {
        if(consoleColors !== undefined)
            return consoleColors[theColor](theString.toString())
        else
            return theString.toString()
    }

    var warningHasBeenPrinted = false
    function lateEventsWarning() {
        if(ended && !warningHasBeenPrinted && printLateEvents) {
            warningHasBeenPrinted = true

            return color('red',
                'Test results were accessed before asynchronous parts of tests were fully complete'
                +" If you have tests with asynchronous parts, make sure to use `this.count` to declare how many assertions you're waiting for."
            )+'\n\n'
        } else {
            return ''
        }
    }


    var ended = false
    return formatBasic(unitTest, printOnTheFly, consoleColors, {
        group: function(name, totalDuration, testSuccesses, testFailures,
                              assertSuccesses, assertFailures, exceptions,
                              testResults, exceptionResults, nestingLevel, timedOut, onTheFly) {

            var total = testSuccesses+testFailures

            var addResults = function() {
                var result = ''
                if(testResults.length > 0)
                    result += '\n'+indent('   ', testResults.join('\n'))
                if(exceptionResults.length > 0)
                    result += '\n'+indent('   ', exceptionResults.join('\n'))
                return result
            }


            var testColor, exceptionColor, finalColor
            testColor = exceptionColor = finalColor = 'green'
            if(testFailures > 0) {
                testColor = finalColor = 'red'
            }
            if(exceptions > 0) {
                exceptionColor = finalColor = 'red'
            }

            var durationText = timeText(totalDuration)

            if(nestingLevel === 0) {
                var resultsLine = ''

                if(name) resultsLine += color('cyan', name+' - ')



                resultsLine += color(finalColor, testSuccesses+'/'+(testSuccesses+testFailures)+' successful tests. ')+
                        color('green', assertSuccesses+' pass'+plural(assertSuccesses,"es",""))+
                        ', '+color('red', assertFailures+' fail'+plural(assertFailures))+
                        ', and '+color('magenta', exceptions+' exception'+plural(exceptions))+"."
                        +color('grey', " Took "+durationText+".")

                var result = ''
                if(name) result += color('cyan', name)+'\n'
                result += addResults()
                result += '\n\n'+resultsLine

                if(timedOut) {
                    result += color('red', '\n    The test timed out')
                }
            } else {
                if(!name) name = "<unnamed test>"
                var result = color(finalColor, name)+':           '
                                +color(testColor, testSuccesses+'/'+total)
                                +" and "+color(exceptionColor, exceptionResults.length+" exception"+plural(exceptionResults.length))
                                +color('grey', " took "+durationText)
                result += addResults()
            }

            return lateEventsWarning()+result
        },
        assert: function(result, test, onTheFly) {
            if(result.success) {
                var word = "Ok!  ";
                var c = 'green'
            } else {
                var word = "Fail:";
                var c = 'red'
            }

            var linesDisplay = result.sourceLines
            if(result.sourceLines.indexOf("\n") !== -1) {
                linesDisplay = "\n"+linesDisplay;
            }

            var expectations = ""
            if(!result.success && (result.actual !== undefined || result.expected !== undefined)) {
                var things = []
                if(result.expected !== undefined)
                    things.push("Expected "+valueToMessage(result.expected))
                if(result.actual !== undefined)
                    things.push("Got "+valueToMessage(result.actual))

                expectations = " - "+things.join(', ')
            }

            var column = ''
            if(result.column !== undefined) {
                column = color('grey', ":"+result.column)
            }

            return lateEventsWarning()+color(c, word)+" ["+color('grey', result.file)+" "+result.line+column+"] "
                        +color(c, linesDisplay)
                        +expectations
        },
        exception: function(e, onTheFly) {
            return lateEventsWarning()+color('red', 'Exception: ')
                        +color('magenta', errorToString(e))
        },
        log: function(values, onTheFly) {
            return lateEventsWarning()+values.map(function(v) {
                return valueToString(v)
            }).join(', ')
        },
        end: function() {
            ended = true
        }
    })
}

function valueToMessage(value) {
    if(value instanceof Error) {
        return errorToString(value)
    } else {
        return util.inspect(value)
    }
}

function errorToString(err) {
    if(err instanceof Error) {
        var otherProperties = []
        for(var n in err) {
            if(Object.hasOwnProperty.call(err, n) && n !== 'message' && n !== 'stack') {
                otherProperties.push(valueToString(err[n]))
            }
        }

        var properties = ''
        if(otherProperties.length > 0)
            properties = '\n'+otherProperties.join("\n")


        if(err.stack !== undefined) {
            if(err.stack.indexOf(err.message) !== -1) { // chrome
                return err.stack+properties
            } else { // firefox (others?)
                return err.message+'\n'+err.stack+properties
            }
        } else {
            return err.toString()+properties
        }
    } else {
        return err
    }
}

function valueToString(v) {
    if(v instanceof Error) {
        return errorToString(v)

    } else if(typeof(v) === 'string') {
        return v
    } else {
        return util.inspect(v)
    }
}

exports.html = function(unitTest, printLateEvents) {
    if(printLateEvents === undefined) printLateEvents = true

    var getTestDisplayer = function() {
        return {
            onToggle: function(displayNone, $bgcolor, innerSelector, outerSelector) {
                if(displayNone == true) {
                    $(innerSelector).css({"display":""});
                    if(outerSelector != undefined) {
                        $(outerSelector).css({"border":"1px solid "+$bgcolor});
                    }
                } else {
                    $(innerSelector).css({"display":"none"});
                    if(outerSelector != undefined) {
                        $(outerSelector).css({"border":""});
                    }
                }
            }
        }
    }

    var red = 'rgb(200,30,30)'
    var darkRed = 'rgb(90,0,0)'
    var lightRed = 'rgb(255,210,230)'
    var black = 'rgb(20,20,20)'
    var white = 'rgb(240,220,220)'
    var green = 'rgb(0,100,20)'
    var brightGreen = 'rgb(0,200,50)'
    var purple = 'rgb(190,0,160)'
    var brightPurple = 'rgb(255,126,255)'
    var blue = 'rgb(0, 158, 173)'
    var brightBlue = 'rgb(0, 233, 255)'
    var gray = 'rgb(185, 180, 180)'


    var formattedTestHtml = formatBasic(unitTest, false, {
        group: function(name, totalDuration, testSuccesses, testFailures,
                          assertSuccesses, assertFailures, exceptions,
                          testResults, exceptionResults, nestingLevel, timedOut) {

            var total = testSuccesses+testFailures
            var mainId = getMainId(name)

            if(testFailures > 0 || exceptions > 0) {
                var bgcolor=red;
                var show = "true";
                var foregroundColor = lightRed
            } else {
                var bgcolor=green;
                var show = "false";
                var foregroundColor = brightGreen
            }

            var durationText = timeText(totalDuration)

            if(nestingLevel === 0) {

                var initTestGroup = function(mainId, bgcolor, show) {
                    $(function()
                    {	$('#'+mainId).css({"border-color":"'+bgcolor+'"});
                        TestDisplayer.onToggle(show, bgcolor, '#'+mainId);

                        $('#'+mainId+'_final').click(function()
                        {	TestDisplayer.onToggle($('#'+mainId).css("display") == "none", bgcolor, '#'+mainId);
                        });
                    });
                }

                var nameLine = "", titleLine = ''
                if(name) {
                    titleLine = '<h1 class="primaryTitle">'+name+'</h1>'
                    nameLine = name+' - '
                }

                var timeoutNote = ""
                if(timedOut) {
                    timeoutNote = 'The test timed out'
                }

                return titleLine+
                       '<div class="testResultsArea" id="'+mainId+'">'+
                            testResults.join('\n')+
                            exceptionResults.join('\n')+"\n"+
                            '<div style="color:'+red+'">'+timeoutNote+'</div>'+
                       '</div>'+
                       '<div class="testResultsBar link" style="border:2px solid '+bgcolor+';" id="'+mainId+'_final">'+
                            '<div class="testResultsBarInner" style="background-color:'+bgcolor+';">'+
                                '<div style="float:right;"><i>click on this bar</i></div>'+
                                '<div><span class="testResultsName">'+nameLine+'</span>' + testSuccesses+'/'+total+' successful tests. '+
                                '<span style="color:'+brightGreen+'">'+assertSuccesses+' pass'+plural(assertSuccesses,"es","")+'</span>'+
                                ', <span style="color:'+darkRed+'">'+assertFailures+' fail'+plural(assertFailures)+'</span>'+
                                ', and <span style="color:'+brightPurple+'">'+exceptions+' exception'+plural(exceptions)+'</span>'+
                                '. <span style="color: '+white+'">Took '+durationText+".</span>"+
                            '</div>'+
                       '</div>'+

                       '<script>;('+initTestGroup+')("'+mainId+'", "'+bgcolor+'", '+show+')</script>'+
                       '</div>'

            } else {
                var n = getNewNumber()

                var testId = mainId+n

                var initTest = function(mainId, bgcolor, show, n) {
                    $(function()
                    {	$('#'+mainId).css({borderColor:bgcolor});
                        TestDisplayer.onToggle(show, bgcolor, '#'+mainId+n+'_inner', '#'+mainId+n);

                        $('.'+mainId+n+'_status').click(function()
                        {	TestDisplayer.onToggle
                            (	$('#'+mainId+n+'_inner').css("display") == "none",
                                bgcolor,
                                '#'+mainId+n+'_inner',
                                '#'+mainId+n+''
                            );
                        });
                    });
                }

                if(!name) name = "<unnamed test>"

                return '<div class="resultsArea" id="'+mainId+n+'">'+
                            '<div class="resultsBar link '+mainId+n+'_status" style="background-color:'+bgcolor+';color:'+foregroundColor+'">'+
                                name+': &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'+
                                testSuccesses+'/'+total+" and "+exceptions+" exception"+plural(exceptions)
                                +' <span style="color: white">took '+durationText+'</span>'+
                            '</div>'+
                            '<div class="resultsAreaInner" id="'+testId+'_inner">'+
                                '<h2 class="'+testId+'_status link" style="color:'+bgcolor+';">'+name+'</h2>'+
                                testResults.join('\n')+"\n"+
                                exceptionResults.join('\n')+"\n"+
                            '</div>'+
                            '<script>;('+initTest+')("'+mainId+'", "'+bgcolor+'", '+show+', '+n+')</script>'+
                      '</div>';
            }
        },
        assert: function(result) {
            if(false === result.success) {
                var color = red;
                var word = "Fail:";
            } else {
                var color = green;
                var word = "Ok!";
            }

            var linesDisplay = "<i>"+textToHtml(result.sourceLines)+"</i>";
            if(result.sourceLines.indexOf("\n") !== -1) {
                linesDisplay = "<br>\n"+linesDisplay;
            }

            var expectations = ""
            if(!result.success && (result.actual !== undefined || result.expected !== undefined)) {
                var things = []
                if(result.expected !== undefined)
                    things.push("Expected "+textToHtml(valueToMessage(result.expected)))
                if(result.actual !== undefined)
                    things.push("Got "+textToHtml(valueToMessage(result.actual)))

                expectations = " - "+things.join(', ')
            }

            var column = ''
            if(result.column !== undefined) {
                column = ":"+result.column
            }

            return '<div style="color:'+color+';"><span >'+word+'</span>'+
                        " <span class='locationOuter'>[<span class='locationInner'>"
                                +result.file+" line <span class='lineNumber'>"+result.line+"</span>"+column+"</span>]"
                        +"</span> "
                    +linesDisplay
                    +' <span class="expectations">'+expectations+'</span>'
            +"</div>"
        },
        exception: function(exception) {
            var formattedException = textToHtml(errorToString(exception))
            return '<div style="color:'+purple+';">Exception: '+formattedException+'</div>'
        },
        log: function(values) {
            return '<div>'
                +values.map(function(v) {
                    return textToHtml(valueToString(v))
                }).join(', ')
            +'</div>'

        }
    })

    return formattedTestHtml.then(function(formattedHtml) {
        return Future('<script src="http://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min.js"></script>'+
        '<style>\
            body{\
                background-color: '+black+';\
                color: '+white+';\
            }\
            h2{\
                margin-bottom: 5px;\
                margin-top: 10px;\
            }\
            .green\
            {   color: '+green+';\
            }\
            .link\
            {   cursor:pointer;\
            }\
            .primaryTitle {\
                color: '+blue+';\
            }\
            .testResultsName {\
                color: '+brightBlue+';\
            }\
            .asyncTime {\
                color: '+gray+';\
            }\
            .resultsArea{\
                margin:1px;\
                margin-bottom: 5px;\
            }\
                .resultsAreaInner{\
                    padding:0 8px;\
                }\
                .resultsBar{\
                    color:white;\
                    margin-bottom:4px;\
                    padding: 1px 3px;\
                }\
            .testResultsArea{\
                padding:0 8px;\
            }\
            .testResultsBar{\
                background-color:'+black+';color:white;margin:4px 0;\
            }\
                .testResultsBarInner{\
                    color:white;margin:1px;padding: 1px 3px;\
                }\
                \
            .locationOuter{\
                color:'+white+';\
            }\
            .locationInner, .expectations {\
                color:'+gray+';\
            }\
            .lineNumber{\
                color:'+white+';\
            }\
         </style>'+
        '<script type="text/javascript">                      \
             var TestDisplayer = ('+getTestDisplayer+')() \
          </script>'
        +formattedHtml)
    })
}

var nextId = 0
var getMainId = function(name) {
    nextId++
    return 'unitTest_'+nextId//+name.replace(/[^a-zA-Z]/g, "") // get rid of all characters except letters
}
var getNewNumber = function() {
    getNewNumber.n++
    return getNewNumber.n
}
getNewNumber.n = 0

function plural(num, plural, singular) {
	var plur = num!==1;

    if(singular === undefined) {
    	if(plur)	return "s"
        else        return ""
    } else {
    	if(plur)	return plural
        else		return singular
    }
}
function htmlEscape(str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
}

function textToHtml(text) {
    return htmlEscape(text)
            .replace(/ /g, '&nbsp;')
            .replace(/\n/g, "<br>\n")
            .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
}

function timeText(ms) {
    if(ms < 2000)
        return ms+"ms"
    else
        return Number(ms/1000).toPrecision(3)+'s'
}

},{"./basicFormatter":13,"./indent":17,"async-future":18,"util":12}],17:[function(require,module,exports){

module.exports = function(i, str) {
    return i+str.split("\n")       // get all lines
              .join("\n"+i)      // join all lines with an indent
}
},{}],18:[function(require,module,exports){
/* Copyright (c) 2013 Billy Tetrud - Free to use for any purpose: MIT License*/

var trimArgs = require("trimArguments")


module.exports = Future

Future.debug = false // switch this to true if you want ids and long stack traces

var curId = 0         // for ids\
function Future(value) {
	if(arguments.length > 0) {
		var f = new Future()
        f.return(value)
        return f
	} else {
        this.isResolved = false
        this.queue = []
        if(Future.debug) {
            curId++
            this.id = curId
        }
    }
}

// static methods

// has one parameter: either a bunch of futures, or a single array of futures
// returns a promise that resolves when one of them errors, or when all of them succeeds
Future.all = function() {
    if(arguments[0] instanceof Array) {
        var futures = arguments[0]
    } else {
        var futures = trimArgs(arguments)
    }

    var f = new Future()
    var results = []

    if(futures.length > 0) {
        var current = futures[0]
        futures.forEach(function(future, index) {
            current = current.then(function(v) {
                results[index] = v
                return futures[index+1]
            })
        })

        //if
        current.catch(function(e) {
            f.throw(e)
        })
        // else
        current.then(function() {
            f.return(results)
        })


    } else {
        f.return(results)
    }

    return f
}

// either used like futureWrap(function(){ ... })(arg1,arg2,etc) or
//  futureWrap(object, 'methodName')(arg1,arg2,etc)
Future.wrap = function() {
    // function
    if(arguments.length === 1) {
        var fn = arguments[0]
        var object = undefined


    // object, function
    } else {
        var object = arguments[0]
        var fn = object[arguments[1]]
    }

    return function() {
        var args = Array.prototype.slice.call(arguments)
        var future = new Future
        args.push(future.resolver())
        var me = this
        if(object) me = object
        fn.apply(me, args)
        return future
    }
}


// default
var unhandledErrorHandler = function(e) {
    setTimeout(function() {
        throw e
    },0)
}

// setup unhandled error handler
// unhandled errors happen when done is called, and  then an exception is thrown from the future
Future.error = function(handler) {
    unhandledErrorHandler = handler
}

// instance methods

// returns a value for the future (can only be executed once)
// if there are callbacks waiting on this value, they are run in the next tick
    // (ie they aren't run immediately, allowing the current thread of execution to complete)
Future.prototype.return = function(v) {
    resolve(this, 'return', v)
}
Future.prototype.throw = function(e) {
    resolve(this, 'error', e)
}

function setNext(that, future) {
    if(future !== undefined && !isLikeAFuture(future) )
        throw Error("Value returned from then or catch *not* a Future: "+future)

    resolve(that, 'next', future)
}

function wait(that, cb) {
    if(that.isResolved) {
        executeCallbacks(that, [cb])
    } else {
        that.queue.push(cb)
    }
}

// duck typing to determine if something is or isn't a future
function isLikeAFuture(x) {
    return x.isResolved !== undefined && x.queue !== undefined && x.then !== undefined
}

function waitOnResult(f, result, cb) {
    wait(result, function() {
        if(this.hasError) {
            f.throw(this.error)
        } else if(this.hasNext) {
            waitOnResult(f, this.next, cb)
        } else {
            try {
                setNext(f, cb(this.result))
            } catch(e) {
                f.throw(e)
            }
        }
    })
}


// cb takes one parameter - the value returned
// cb can return a Future, in which case the result of that Future is passed to next-in-chain
Future.prototype.then = function(cb) {
    var f = new Future
    wait(this, function() {
        if(this.hasError)
            f.throw(this.error)
        else if(this.hasNext)
            waitOnResult(f, this.next, cb)
        else {
            try {
                setNext(f, cb(this.result))
            } catch(e) {
                f.throw(e)
            }
        }
    })
    return f
}
// cb takes one parameter - the error caught
// cb can return a Future, in which case the result of that Future is passed to next-in-chain
Future.prototype.catch = function(cb) {
    var f = new Future
    wait(this, function() {
        if(this.hasError) {
            try {
                setNext(f, cb(this.error))
            } catch(e) {
                f.throw(e)
            }
        } else if(this.hasNext) {
            this.next.then(function(v) {
                f.return(v)
            }).catch(function(e) {
                setNext(f, cb(e))
            })
        } else {
            f.return(this.result)
        }
    })
    return f
}
// cb takes no parameters
// callback's return value is ignored, but thrown exceptions propogate normally
Future.prototype.finally = function(cb) {
    var f = new Future
    wait(this, function() {
        try {
            var that = this
            if(this.hasNext) {
                this.next.then(function(v) {
                    var x = cb()
                    f.return(v)
                    return x
                }).catch(function(e) {
                    var x = cb()
                    f.throw(e)
                    return x
                }).done()
            } else if(this.hasError) {
                Future(true).then(function() {
                    return cb()
                }).then(function() {
                    f.throw(that.error)
                }).catch(function(e) {
                    f.throw(e)
                }).done()

            } else  {
                Future(true).then(function() {
                    return cb()
                }).then(function() {
                    f.return(that.result)
                }).catch(function(e) {
                    f.throw(e)
                }).done()
            }
        } catch(e) {
            f.throw(e)
        }
    })
    return f
}

// all unused futures should end with this (e.g. most then-chains)
// detatches the future so any propogated exception is thrown (so the exception isn't silently lost)
Future.prototype.done = function() {
    wait(this, function() {
        if(this.hasError) {
            unhandledErrorHandler(this.error)
        } else if(this.hasNext) {
            this.next.catch(function(e) {
                unhandledErrorHandler(e)
            })
        }
    })
}



Future.prototype.resolver = function() {
    var me = this

    return function(e,v) {
        if(e) { // error argument
            me.throw(e)
        } else {
            me.return(v)
        }
    }
}

Future.prototype.resolved = function() {
    return this.isResolved
}


function resolve(that, type, value) {
    if(that.isResolved)
        throw Error("Future resolved more than once! Resolution: "+value)

    that.isResolved = true
    that.hasError = type === 'error'
    that.hasNext = type === 'next' && value !== undefined

    if(that.hasError)
        that.error = value
    else if(that.hasNext)
        that.next = value
    else
        that.result = value

    executeCallbacks(that, that.queue)
}

function executeCallbacks(that, callbacks) {
    if(callbacks.length > 0) {
        setTimeout(function() {
            callbacks.forEach(function(cb) {
                cb.apply(that)
            })
        },0)
    }
}

},{"trimArguments":19}],19:[function(require,module,exports){
// resolves varargs variable into more usable form
// args - should be a function arguments variable
// returns a javascript Array object of arguments that doesn't count trailing undefined values in the length
module.exports = function(theArguments) {
    var args = Array.prototype.slice.call(theArguments, 0)

    var count = 0;
    for(var n=args.length-1; n>=0; n--) {
        if(args[n] === undefined)
            count++
    }
    args.splice(-0, count)
    return args
}
},{}],20:[function(require,module,exports){
"use strict";
/* Copyright (c) 2014 Billy Tetrud - Free to use for any purpose: MIT License*/

var deadunitCore = require("./deadunitCore")
var browserConfig = require('./deadunitCore.browserConfig')

module.exports = deadunitCore(browserConfig())
},{"./deadunitCore":22,"./deadunitCore.browserConfig":21}],21:[function(require,module,exports){
"use strict";
/* Copyright (c) 2014 Billy Tetrud - Free to use for any purpose: MIT License*/

var path = require('path');

var Future = require('async-future')
var proto = require('proto')
var stackinfo = require('stackinfo')
var ajax = require("ajax")
var resolveSourceMap = Future.wrap(require('source-map-resolve').resolveSourceMap)

var deadunitCore = require("./deadunitCore")
var isRelative = require('./isRelative')

ajax.setSynchronous(true) // todo: REMOVE THIS once this chrome bug is fixed in a public release: https://code.google.com/p/chromium/issues/detail?id=368444

// add sourceFile contents into stacktrace.js's cache
var sourceCache = {}
var cacheGet = function(url) {
    return sourceCache[url]
}
var cacheSet = function(url, responseFuture) {
    sourceCache[url] = responseFuture
    if(stackinfo.sourceCache[url] === undefined) {
        responseFuture.then(function(response) {
            stackinfo.sourceCache[url] = response.text.split('\n')
        }).done()
    }
}

if(window.setImmediate === undefined) {
    window.setImmediate = function(fn, params) {
        setTimeout(function() {
            fn.apply(this,params)
        },0)
    }
}

ajax.cacheGet(cacheGet)
ajax.cacheSet(cacheSet)


var config = module.exports = proto(function() {
    this.init = function() {
        var that = this
        // node.js errback style readFile
        /*private*/ this.readFile = function(url, callback) {
            that.ajax(url).then(function(response) { // need to use 'that' because readFile will not be called with this config object as the context
                callback(undefined, response.text)
            }).catch(callback).done()
        }
    }

    this.ajax = ajax

    this.initialize = function() {}

    this.initializeMainTest = function(testState) {
        //testState.active = true // make sure

        testState.oldOnerror = window.onerror
        testState.newOnerror = window.onerror = function(errorMessage, filename, line, column) {
            if(column === undefined) var columnText = ''
            else                     var columnText = "/"+column

            try {
                throw new Error("Uncaught error in "+filename+" line "+line+columnText+": "+errorMessage) // IE needs the exception to actually be thrown before it will have a stack trace
            } catch(e) {
                testState.unhandledErrorHandler(e, true)
                if(testState.oldOnerror)
                    testState.oldOnerror.apply(this, arguments)
            }
        }
    }
    this.mainTestDone= function(testState) {
        //testState.active = false // make sure the test-specific onerror code is no longer run
        /*if(testState.newOnerror === window.onerror) {
            window.onerror = testState.oldOnerror // otherwise something else has overwritten onerror, so don't mess with it
        }*/
    }

    this.getDomain= function() {
        return undefined // domains don't exist in-browser
    }

    this.runTestGroup= function(deadunitState, tester, runTest, handleError, handleUnhandledError) {
        runTest()
    }
    this.getScriptSourceLines= function(path) {
        if(stackinfo.sourceCache[path] !== undefined) {
            return Future(stackinfo.sourceCache[path])
        } else {
            return this.ajax(path).then(function(response) {
                return Future(response.text.split('\n'))
            })
        }

    }
    this.getSourceMapObject = function(url, warningHandler) {
        var that = this
        return this.ajax(url).then(function(response) {
            var headers = response.headers
            if(headers['SourceMap'] !== undefined) {
                var headerSourceMap = headers['SourceMap']
            } else if(headers['X-SourceMap']) {
                var headerSourceMap = headers['X-SourceMap']
            }

            if(headerSourceMap !== undefined) {
                if(isRelative(headerSourceMap)) {
                    headerSourceMap = path.join(path.dirname(url),headerSourceMap)
                }

                return that.ajax(headerSourceMap).then(function(response) {
                    return Future(JSON.parse(response.text))
                })

            } else {
                return resolveSourceMap(response.text, url, that.readFile).catch(function(e){
                    warningHandler(e)
                    return Future(undefined)

                }).then(function(sourceMapObject) {
                    if(sourceMapObject !== null) {
                        return Future(sourceMapObject.map)
                    } else {
                        return Future(undefined)
                    }
                })
            }
        })
    }

    this.defaultUnhandledErrorHandler= function(e) {
        //if(e !== undefined)
            setTimeout(function() {
                if(e.stack)
                    console.log(e.stack)
                else
                    console.log(e)
            },0)
    }
    this.defaultTestErrorHandler= function(tester) {
        return function(e) {
            tester.manager.emit('exception', {
                parent: tester.mainSubTest.id,
                time: (new Date()).getTime(),
                error: e
            })
        }
    }

    this.getLineInfo= function(stackIncrease) {
        return stackinfo()[3+stackIncrease]
    }

    this.getExceptionInfo= function(e) {
        return stackinfo(e)
    }
})
},{"./deadunitCore":22,"./isRelative":23,"ajax":24,"async-future":27,"path":4,"proto":47,"source-map-resolve":31,"stackinfo":44}],22:[function(require,module,exports){
"use strict";
/* Copyright (c) 2013 Billy Tetrud - Free to use for any purpose: MIT License*/

var path = require('path')
var Url = require("url")

var proto = require('proto')
var Future = require('async-future')
var SourceMapConsumer = require('source-map').SourceMapConsumer

var processResults = require('./processResults')
var isRelative = require('./isRelative')

// returns a module intended for a specific environment (that environment being described by the options)
// options can contain:
    // initialization - a function run once that can setup things (like a global error handler).
        // Gets a single parameter 'state' which has the following form:
            // unhandledErrorHandler(error,warn)
    // initializeMainTest - a function run once that can setup things (like a test-specific handler).
        // Gets a single parameter 'mainTestState' which has the following form:
            // unhandledErrorHandler(error,warn) - the error handler for that test
    // getDomain - a function that returns the current domain, or undefined if the environment (*cough* browsers) doesn't have domains
    // getSourceMapObject - a function that returns a future of the pre-parsed source map object for a file, or future undefined
        // gets the parameter:
            // url - the url of the file to find a sourcemap for
            // warningHandler - a warningHandler function that expects an error to be passed to it
    // runTestGroup - a function run that allows you to wrap the actual test run in some way (intended for node.js domains)
        // gets parameters:
            // state - the same state object sent into `initialization`
            // tester - a UnitTester object for the test
            // runTest - the function that you should call to run the test group. Already has a synchronous try catch inside it (so you don't need to worry about that)
            // handleError - a function that handles an error if one comes up. Takes the error as its only parameter. Returns a future.
    // mainTestDone - a function run once a test is done
        // gets the 'mainTestState' parameter
    // defaultUnhandledErrorHandler - a function that handles an error unhandled by any other handler
        // gets the 'error' as its only parameter
    // defaultTestErrorHandler - is passed the current test, and should return a function that handles an error
module.exports = function(options) {

    // a variable that holds changeable state
    var state = {
        unhandledErrorHandler: options.defaultUnhandledErrorHandler
    }

    options.initialize(state)

    // the prototype of objects used to manage accessing and displaying results of a unit test
    var UnitTest = proto(function() {
        this.init = function(/*mainName=undefined, groups*/) {
            var that = this
            var args = arguments
            this.manager = EventManager(this)

            setTimeout(function() {
                runTest.call(that, args)
            },0)
        }

        this.events = function(handlers) {
            this.manager.add(handlers, options.getDomain())
            return this
        }

        this.results = function() {
            return processResults(this)
        }

        // private

        function runTest(args) {
            var fakeTest = new UnitTester()
                fakeTest.id = undefined // fake test doesn't get an id
                fakeTest.manager = this.manager
                fakeTest.timeouts = []
                fakeTest.onDoneCallbacks = []

                var getUnhandledErrorHandler = function() {
                    var unhandledErrorHandler = createUnhandledErrorHandler(fakeTest.mainSubTest)
                    getUnhandledErrorHandler = function() { // memoize this junk
                        return unhandledErrorHandler
                    }
                    return unhandledErrorHandler
                }
                fakeTest.mainTestState = {get unhandledErrorHandler(){return getUnhandledErrorHandler() || options.defaultTestErrorHandler(fakeTest)}}

                var warningInfoMessageHasBeenOutput = false
                fakeTest.warningHandler = function(w) {
                    var errorHandler = getUnhandledErrorHandler()
                    if(warningInfoMessageHasBeenOutput === false) {
                        var warning = newError("You've received at least one warning. If you don't want to treat warnings as errors, use the `warning` method to redefine how to handle them.")
                        errorHandler(warning, false)
                        warningInfoMessageHasBeenOutput = true
                    }

                    errorHandler(w, false)
                }

                options.initializeMainTest(fakeTest.mainTestState)

                timeout(fakeTest, 3000, true) // initial (default) timeout
                fakeTest.onDone = function() { // will execute when this test is done
                    fakeTest.manager.lastEmitFuture.then(function() { // wait for all the already-registered emits to emit before finalizing the test
                        done(fakeTest)
                        options.mainTestDone(fakeTest.mainTestState)
                    }).done()
                }
                fakeTest.callOnDone = function(cb) {
                    fakeTest.onDoneCallbacks.push(cb)
                }

            UnitTester.prototype.test.apply(fakeTest, args) // set so the error handler can access the real test
            this.mainTester = fakeTest

            fakeTest.groupEnded = true
            checkGroupDone(fakeTest)
        }
    })

    var EventManager = proto(function() {

        this.init = function(testObject) {
            this.handlers = {
                group: [],
                assert: [],
                count: [],
                exception: [],
                log: [],
                end: [],
                groupEnd: [],
                before: [],
                after: [],
                beforeEnd: [],
                afterEnd: []
            }

            this.history = []
            this.emitDepth = 0 // records how many futures are waiting on eachother, so we can make sure maximum stack depth isn't exceeded
            this.lastEmitFuture = Future(undefined)
            this.testObject = testObject
        }

        this.testObject; // used to get the right warningHandler

        // emits an event
        // eventDataFuture resolves to either an eventData object, or undefined if nothing should be emitted
        this.emit = function(type, eventDataFuture) {
            var that = this
            var lastEmitFuture = that.lastEmitFuture // capture it for the possible setTimeout threadlet
            var doStuff = function(f) {
                var resultFuture = lastEmitFuture.then(function() {
                    return eventDataFuture
                }).then(function(eventData){
                    if(eventData !== undefined)
                        recordAndTriggerHandlers.call(that, type, eventData)
                }).catch(function(e) {
                    that.testObject.warningHandler(e)
                })

                if(f !== undefined) {
                    resultFuture.finally(function() {
                        setTimeout(function(){f.return()},0) // make sure we don't get a "too much recursion error" // todo: test not doing this once browsers all support proper tail calls
                    })
                    return f
                } else {
                    return resultFuture
                }
            }

            this.emitDepth++
            if(this.emitDepth % 40 === 0) { // 40 seems to be the magic number here for firefox - such a finicky browser
                that.lastEmitFuture = doStuff(new Future)
            } else {
                that.lastEmitFuture = doStuff()
            }

            return this.lastEmitFuture
        }

        // adds a set of listening handlers to the event stream, and runs those handlers on the stream's history
        // domain is optional, but if defined will be the node.js domain that unhandled errors will be routed to
        this.add = function(handlers, domain) {
            // run the history of events on the the handlers
            this.history.forEach(function(e) {
                if(handlers[e.type] !== undefined) {
                    handlers[e.type].call(undefined, e.data)
                }
            })

            // then have those handlers listen on future events
            for(var type in handlers) {
                var typeHandlers = this.handlers[type]
                if(typeHandlers === undefined) {
                    throw new Error("event type '"+type+"' invalid")
                }

                typeHandlers.push({handler: handlers[type], domain: domain})
            }
        }

        // the synchronous part of emitting
        function recordAndTriggerHandlers(type, eventData) {
            this.history.push({type:type, data: eventData})
            this.handlers[type].forEach(function(handlerInfo) {
                try {
                    handlerInfo.handler.call(undefined, eventData)
                } catch(e) {

                    var throwErrorFn = function() {
                        throw e // throw error asynchronously because these error should be separate from the test exceptions
                    }

                    if(handlerInfo.domain) {
                        throwErrorFn = handlerInfo.domain.bind(throwErrorFn)    // this domain bind is needed because emit is done inside deadunit's test domain, which isn't where we want to put errors caused by the event handlers
                    }

                    setTimeout(throwErrorFn, 0)
                }
            })
        }
    })

    function testGroup(tester, test) {

        // handles any error (synchronous or asynchronous errors)
        var handleError = createUnhandledErrorHandler(tester)

        var runTest = function() {
            try {
                test.call(tester, tester) // tester is both 'this' and the first parameter (for flexibility)
            } catch(e) {
                handleError(e, true).done()
            }
         }

        options.runTestGroup(state, tester, runTest, handleError)
    }

    function createUnhandledErrorHandler(tester) {

        var handleErrorInErrorHandler = function(warn, newError) {
            if(warn !== false) {
                try {
                    tester.warningHandler(newError)
                } catch(warningHandlerError) {
                    tester.manager.emit('exception', Future(warningHandlerError)).done() // if shit gets this bad, that sucks
                }
            } else {
                console.error(newError)
            }
        }

        // warn should be set to false if the handler is being called to report a warning
        return function(e, warn) {
            if(tester.unhandledErrorHandler !== undefined) {
                try {
                    tester.unhandledErrorHandler(e)
                    return Future(undefined)

                } catch(newError) {     // error handler had an error...
                    handleErrorInErrorHandler(warn, newError)
                }
            }
            // else

            var errorToEmit = mapException(e, tester.warningHandler).catch(function(newError) {
                if(newError.message !== "Accessing the 'caller' property of a function or arguments object is not allowed in strict mode") { // stacktrace.js doesn't support IE for certain things
                    handleErrorInErrorHandler(warn, newError)
                }
                return Future(e) // use the original unmapped exception

            }).then(function(exception){
                return Future(exceptionEmitData(tester,exception))
            })

            var emitFuture = tester.manager.emit('exception', errorToEmit)
            return afterWaitingEmitIsComplete(tester, emitFuture)

        }
    }

    function exceptionEmitData(tester, e) {
        return {
            parent: tester.id,
            time: now(),
            error: e
        }
    }


    // the prototype of objects used to write tests and contain the results of tests
    var UnitTester = function(name, mainTester) {
        if(!mainTester) mainTester = this

        this.id = groupid()
        this.mainTester = mainTester // the mainTester is used to easily figure out if the test results have been accessed (so early accesses can be detected)
        this.name = name

        this.doneTests = 0
        this.doneAsserts = 0
        this.runningTests = 0 // the number of subtests created synchronously
        this.doneCalled = false
        this.doSourcemappery = true // whether to do source mapping, if possible, within this test

        this.complete = new Future // resolved when done
    }

        UnitTester.prototype = {
            test: function() {
                if(arguments.length === 1) {
                    var test = arguments[0]

                // named test
                } else {
                    var name = arguments[0]
                    var test = arguments[1]
                }

                var that = this
                this.runningTests++

                var tester = new UnitTester(name, this.mainTester)
                tester.manager = this.manager
                tester.doSourcemappery = this.doSourcemappery // inherit from parent test
                tester.warningHandler = this.warningHandler

                if(this.id === undefined) { // ie its the top-level fake test
                    this.mainSubTest = tester
                }

                tester.onDone = function() { // will execute when this test is done
                    that.doneTests += 1

                    that.manager.emit('groupEnd', Future({
                        id: tester.id,
                        time: now()
                    }))

                    try {
                        tester.complete.return()
                    } catch(e) {
                        createUnhandledErrorHandler(tester)(e)
                    }

                    checkGroupDone(that)
                }

                tester.mainTester.callOnDone(function() {
                    if(!tester.doneCalled) { // a timeout happened - end the test
                        tester.doneCalled = true
                        that.manager.emit('groupEnd', Future({
                            id: tester.id,
                            time: now()
                        }))
                    }
                })

                this.manager.emit('group', Future({
                    id: tester.id,
                    parent: this.id,
                    name: name,
                    time: now()
                }))

                if(this.beforeFn) {
                    this.manager.emit('before', Future({
                        parent: tester.id,
                        time: now()
                    }))

                    this.beforeFn.call(this, this)

                    this.manager.emit('beforeEnd', Future({
                        parent: tester.id,
                        time: now()
                    }))
                }

                testGroup(tester, test)

                if(this.afterFn) {
                    this.manager.emit('after', Future({
                        parent: tester.id,
                        time: now()
                    }))

                    this.afterFn.call(this, this)

                    this.manager.emit('afterEnd', Future({
                        parent: tester.id,
                        time: now()
                    }))
                }

                tester.groupEnded = true
                checkGroupDone(tester)

                return tester
            },

            ok: function(success, actualValue, expectedValue) {
                this.doneAsserts += 1
                afterWaitingEmitIsComplete(this, assert(this, success, actualValue, expectedValue, 'assert', "ok")).done()
            },
            eq: function(actualValue, expectedValue) {
                this.doneAsserts += 1
                afterWaitingEmitIsComplete(this, assert(this, expectedValue === actualValue, actualValue, expectedValue, 'assert', "eq")).done()
            },
            count: function(number) {
                if(this.countExpected !== undefined)
                    throw Error("count called multiple times for this test")
                this.countExpected = number

                afterWaitingEmitIsComplete(this,assert(this, undefined, undefined, number, 'count', "count")).done()
            },

            before: function(fn) {
                if(this.beforeFn !== undefined)
                    throw Error("before called multiple times for this test")

                this.beforeFn = fn
            },
            after: function(fn) {
                if(this.afterFn !== undefined)
                    throw Error("after called multiple times for this test")

                this.afterFn = fn
            },

            log: function(/*arguments*/) {
                this.manager.emit('log', Future({
                    parent: this.id,
                    time: now(),
                    values: Array.prototype.slice.call(arguments, 0)
                }))
            },

            timeout: function(t) {
                timeout(this, t, false)
            },

            error: function(handler) {
                this.unhandledErrorHandler = handler
            },
            warning: function(handler) {
                this.warningHandler = handler
            },

            sourcemap: function(doSourcemappery) {
                this.doSourcemappery = doSourcemappery
            }
        }

    function afterWaitingEmitIsComplete(that, assertFuture) {
        return assertFuture.finally(function() {
            checkGroupDone(that)
        })
    }

    function checkGroupDone(group) {
        if(!group.doneCalled && group.groupEnded === true
            && ((group.countExpected === undefined || group.countExpected <= group.doneAsserts+group.doneTests)
                && group.runningTests === group.doneTests)
        ) {
            group.doneCalled = true // don't call twice
            group.onDone()
        }

    }

    function done(unitTester) {
        if(unitTester.mainTester.ended) {
            unitTester.mainTester.manager.emit('exception', Future({
                parent: unitTester.mainTester.mainSubTest.id,
                time: now(),
                error: newError("done called more than once (probably because the test timed out before it finished)")
            }))
        } else {
            unitTester.mainTester.timeouts.forEach(function(to) {
                clearTimeout(to)
            })
            unitTester.mainTester.timeouts = []

            endTest(unitTester, 'normal')
        }
    }

    // if a timeout is the default, it can be overridden
    function timeout(unitTester, t, theDefault) {
        var timeouts = unitTester.mainTester.timeouts

        var to = setTimeout(function() {
            remove(timeouts, to)

            if(timeouts.length === 0 && !unitTester.mainTester.ended) {
                endTest(unitTester.mainTester, 'timeout')
            }
        }, t)

        timeouts.push(to)

        if(theDefault) {
            timeouts.default = to
        } else if(timeouts.default !== undefined) {
            clearTimeout(timeouts.default)
            remove(timeouts, timeouts.default)
            timeouts.default = undefined
        }

        function remove(array, item) {
            var index = array.indexOf(item)
            if(index === -1)
                throw Error("Item doesn't exist to remove")
            array.splice(index, 1)
        }
    }

    function endTest(that, type) {
        that.mainTester.ended = true

        if(that.mainTester === that) { // if its the main tester
            that.onDoneCallbacks.forEach(function(cb) {
                cb()
            })
        }

        setTimeout(function() { // setTimeout here is to make it so the currently running threadlet that caused the test to end can finish before the end event is sent
            that.manager.emit('end', Future({
                type: type,
                time: now()
            }))
        },0)
    }

    function assert(that, success, actualValue, expectedValue, type, functionName/*="ok"*/, lineInfo/*=dynamic*/, stackIncrease/*=0*/) {
        if(!stackIncrease) stackIncrease = 1
        if(!functionName) functionName = "ok"
        if(!lineInfo)
            var lineInfoFuture = getLineInformation(functionName, stackIncrease, that.doSourcemappery, that.warningHandler)
        else
            var lineInfoFuture = Future(lineInfo)

        var emitData = lineInfoFuture.then(function(lineInfo) {
            var result = lineInfo
            result.type = 'assert'
            result.success = success

            if(actualValue !== undefined)     result.actual = actualValue
            if(expectedValue !== undefined)   result.expected = expectedValue

            result.parent = that.id
            result.time = now()

           return Future(result)
        })

        return that.manager.emit(type, emitData)
    }


    function getLineInformation(functionName, stackIncrease, doSourcemappery, warningHandler) {
        var info = options.getLineInfo(stackIncrease)

        var file, line, column;

        return getSourceMapConsumer(info.file, warningHandler).catch(function(e){
            warningHandler(e)
            return Future(undefined)

        }).then(function(sourceMapConsumer) {
            if(sourceMapConsumer !== undefined && doSourcemappery) {

                var mappedInfo = getMappedSourceInfo(sourceMapConsumer, info.file, info.line, info.column)
                file = mappedInfo.file
                line = mappedInfo.line
                column = mappedInfo.column
                var sourceLines = mappedInfo.sourceLines

                var multiLineSearch = !mappedInfo.usingOriginalFile // don't to a multi-line search if the source has been mapped (the file might not be javascript)
            } else {
                file = info.file
                line = info.line
                column = info.column
                var sourceLines = undefined
                var multiLineSearch = true
            }

            return getFunctionCallLines(sourceLines, file, functionName, line, multiLineSearch, warningHandler)

        }).catch(function(e) {
            warningHandler(e)
            return Future("<source not available>")
        }).then(function(sourceLines) {
            return Future({
                sourceLines: sourceLines,
                file: path.basename(file),
                line: line,
                column: column
            })
        })
    }

    // returns the line, column, and filename mapped from a source map
    // appropriately handles cases where some information is missing
    function getMappedSourceInfo(sourceMapConsumer, originalFilePath, originalLine, originalColumn, originalFunctionName) {
        var sourceMapInfo = sourceMapConsumer.originalPositionFor({line:originalLine, column:originalColumn||0})       // the 0 is for browsers (like firefox) that don't output column numbers
        var line = sourceMapInfo.line
        var column = sourceMapInfo.column
        var fn = sourceMapInfo.name

        if(sourceMapInfo.source !== null) {
            var relative = isRelative(sourceMapInfo.source)

            /* I don't think this is needed any longer, and probably isn't correct - this was working around an issue in webpack: See https://github.com/webpack/webpack/issues/559 and https://github.com/webpack/webpack/issues/238
            if(sourceMapConsumer.sourceRoot !== null) {
                sourceMapInfo.source = sourceMapInfo.source.replace(sourceMapConsumer.sourceRoot, '') // remove sourceRoot
            }*/

            if(relative) {
                var file = Url.resolve(originalFilePath, path.basename(sourceMapInfo.source))
            } else {
                var file = sourceMapInfo.source
            }


            var originalFile = true
        } else {
            var file = originalFilePath
            var originalFile = false
        }

        if(fn === null || !originalFile) {
            fn = originalFunctionName
        }
        if(line === null || !originalFile) {
            line = originalLine
            column = originalColumn
        }
        if(column === null) {
            column = undefined
        }

        if(file != undefined && sourceMapConsumer.sourcesContent != undefined) { // intentional single !=
            var index = sourceMapConsumer.sources.indexOf(file)
            var sourceLines = sourceMapConsumer.sourcesContent[index]
            if(sourceLines !== undefined) sourceLines = sourceLines.split('\n')
        }

        return {
            file: file,
            function: fn,
            line: line,
            column: column,
            usingOriginalFile: originalFile,
            sourceLines: sourceLines
        }
    }

    // gets the actual lines of the call
    // if multiLineSearch is true, it finds
    function getFunctionCallLines(sourcesContent, filePath, functionName, lineNumber, multiLineSearch, warningHandler) {
        if(sourcesContent !==  undefined) {
            var source = Future(sourcesContent)
        } else {
            var source = options.getScriptSourceLines(filePath)
        }
        return source.catch(function(e) {
            warningHandler(e)
            return Future(undefined)

        }).then(function(fileLines) {
            if(fileLines !== undefined) {

                var startLine = findStartLine(fileLines, functionName, lineNumber)
                if(startLine === 'lineOfCodeNotFound') {
                    return Future("<line of code not found (possibly an error?)> ")

                } else if(startLine !== 'sourceNotAvailable') {
                    if(multiLineSearch) {
                        return Future(findFullSourceLine(fileLines, startLine))
                    } else {
                        return Future(fileLines[startLine].trim())
                    }
                }
            }
            // else
            return Future("<source not available>")

        })
    }

    var sourceMapConsumerCache = {} // a map from a script url to a future of its SourceMapConsumer object (null means no sourcemap exists)
    function getSourceMapConsumer(url, warningHandler) {
        if(sourceMapConsumerCache[url] === undefined) {
            try {
                sourceMapConsumerCache[url] = options.getSourceMapObject(url, warningHandler).then(function(sourceMapObject) {
                    if(sourceMapObject !== undefined) {
                        if(sourceMapObject.version === undefined) {
                            warningHandler(new Error("Sourcemap for "+url+" doesn't contain the required 'version' property. Assuming version 2."))
                            sourceMapObject.version = 2 // assume version 2 to make browserify's broken sourcemap format that omits the version
                        }
                        return Future(new SourceMapConsumer(sourceMapObject))
                    } else {
                        return Future(undefined)
                    }
                })
            } catch(e) {
                sourceMapConsumerCache[url] = Future(undefined)
                warningHandler(e)
            }
        }

        return sourceMapConsumerCache[url]
    }

    // takes an exception and returns a future exception that has a stacktrace with sourcemapped tracelines
    function mapException(exception, warningHandler) {
        try {
            if(exception instanceof Error) {
                var trace = options.getExceptionInfo(exception)
                var smcFutures = []
                for(var n=0; n<trace.length; n++) {
                    if(trace[n].file !== undefined) {
                        smcFutures.push(getSourceMapConsumer(trace[n].file, warningHandler))
                    } else {
                        smcFutures.push(Future(undefined))
                    }
                }

                return Future.all(smcFutures).then(function(sourceMapConsumers) {
                    var CustomMappedException = proto(MappedException, function() {
                        // set the name so it looks like the original exception when printed
                        // this subclasses MappedException so that name won't be an own-property
                        this.name = exception.name
                    })

                    try {
                        throw CustomMappedException(exception, trace, sourceMapConsumers)  // IE doesn't give exceptions stack traces unless they're actually thrown
                    } catch(mappedExcetion) {
                        return Future(mappedExcetion)
                    }
                })
            } else {
                return Future(exception)
            }
        } catch(e) {
            var errorFuture = new Future
            errorFuture.throw(e)
            return errorFuture
        }
    }

    // an exception where the stacktrace's files and lines are mapped to the original file (when applicable)
    var MappedException = proto(Error, function(superclass) {

        // constructor. Takes the parameters:
            // originalError
            // traceInfo - an array where each element is an object containing information about that stacktrace line
            // sourceMapConsumers - an array of the same length as traceInfo where each element is the sourcemap consumer for the corresponding info in traceInfo
        this.init = function(originalError, traceInfo, sourceMapConsumers) {
            superclass.call(this, originalError.message)

            for(var p in originalError) {
                if(Object.hasOwnProperty.call(originalError, p)) {
                    this[p] = originalError[p]
                }
            }

            var newTraceLines = []
            for(var n=0; n<traceInfo.length; n++) {
                var info = traceInfo[n]
                if(sourceMapConsumers[n] !== undefined) {
                    info = getMappedSourceInfo(sourceMapConsumers[n], info.file, info.line, info.column, info.function)
                }

                var fileLineColumn = info.line
                if(info.column !== undefined) {
                    fileLineColumn += ':'+info.column
                }
                if(info.file !== undefined) {
                    fileLineColumn = info.file+':'+fileLineColumn
                }

                var traceLine = "    at "
                if(info.function !== undefined) {
                    traceLine += info.function+' ('+fileLineColumn+')'
                } else {
                    traceLine += fileLineColumn
                }

                newTraceLines.push(traceLine)
            }

            this.stack = this.name+': '+this.message+'\n'+newTraceLines.join('\n')
        }
    })

    // attempts to find the full function call expression (over multiple lines) given the sources lines and a starting point
    function findFullSourceLine(fileLines, startLine) {
        var lines = []
        var parenCount = 0
        var mode = 0 // mode 0 for paren searching, mode 1 for double-quote searching, mode 2 for single-quote searching
        var lastWasBackslash = false // used for quote searching
        for(var n=startLine; true; n++) {
            var line = fileLines[n]
            lines.push(line.trim())

            for(var i=0; i<line.length; i++) {
                var c = line[i]

                if(mode === 0) {
                    if(c === '(') {
                        parenCount++
                        //if(parenCount === 0) {
                          //  return lines.join('\n') // done
                        //}
                    } else if(c === ')' && parenCount > 0) {
                        parenCount--
                        if(parenCount === 0) {
                            return lines.join('\n') // done
                        }
                    } else if(c === '"') {
                        mode = 1
                    } else if(c === "'") {
                        mode = 2
                    }
                } else if(mode === 1) {
                    if(c === '"' && !lastWasBackslash) {
                        mode = 0
                    }

                    lastWasBackslash = c==='\\'
                } else { // mode === 2
                    if(c === "'" && !lastWasBackslash) {
                        mode = 0
                    }

                    lastWasBackslash = c==='\\'
                }
            }
        }

        return lines.join('\n') // if it gets here, something minor went wrong
    }

    // finds the line a function started on given the file's lines, and the stack trace line number (and function name)
    // returns undefined if something went wrong finding the startline
    function findStartLine(fileLines, functionName, lineNumber) {
        var startLine = lineNumber - 1
        while(true) {
            if(startLine < 0) {
                return 'lineOfCodeNotFound' // something went wrong if this is being returned (the functionName wasn't found above - means you didn't get the function name right)
            }

            var line = fileLines[startLine]
            if(line === undefined) {
                return 'sourceNotAvailable'
            }

            //lines.push(line.trim())
            var containsFunction = line.indexOf(functionName) !== -1
            if(containsFunction) {
                return startLine
            }

            startLine--
        }
    }

    function groupid() {
        groupid.next++
        return groupid.next
    }
    groupid.next = -1

    // returns a Unix Timestamp for now
    function now() {
        return (new Date()).getTime()
    }

    return {
        test: UnitTest
    }
}

function newError(message, ErrorPrototype) {
    try {
        throw new Error(message) // IE needs an exception to be actually thrown to get a stack trace property
    } catch(e) {
        return e
    }
}
},{"./isRelative":23,"./processResults":46,"async-future":27,"path":4,"proto":47,"source-map":32,"url":10}],23:[function(require,module,exports){
var path = require('path')

module.exports = function isRelative(p) {
    var normal = path.normalize(p)
    var absolute = path.resolve(p)
    return normal != absolute && p.indexOf('://') === -1// second part for urls
}
},{"path":4}],24:[function(require,module,exports){
var Future = require("async-future")

// returns the XHR function or equivalent for use with ajax
// memoizes the function for faster repeated use
var createXMLHTTPObject = function() {
    var versions = ["Msxml2.XMLHTTP",
                    "Msxml3.XMLHTTP",
                    "Microsoft.XMLHTTP",
                    "MSXML2.XmlHttp.6.0",
                    "MSXML2.XmlHttp.5.0",
                    "MSXML2.XmlHttp.4.0",
                    "MSXML2.XmlHttp.3.0",
                    "MSXML2.XmlHttp.2.0"
    ]

    if(XMLHttpRequest !== undefined) {  // For non-IE browsers
        createXMLHTTPObject = function() {  // Use memoization to cache the factory
            return new XMLHttpRequest()
        }
        return createXMLHTTPObject()

    } else { // IE
        for(var i=0, n=versions.length; i<n; i++) {
            try {
                var version = versions[i]
                var fn = function() {
                    return new ActiveXObject(version)
                }
                createXMLHTTPObject = fn   // Use memoization to cache the factory
                return createXMLHTTPObject()

            } catch(e) {   }
        }
    }

    throw new Error('Cant get XmlHttpRequest object')
}



var HEADER = "([^\\s]+): (.*)"

// returns the contents and headers from a given URL
exports = module.exports = function(url) {
    if(getFromCache(url))
        return getFromCache(url)

    var futureResult = new Future
    setOnCache(url, futureResult)

    var req = createXMLHTTPObject()
    req.onreadystatechange = function() {
        if( req.readyState === 4 ) {
            if( req.status === 200 ) {
                var headers = {}
                req.getAllResponseHeaders().split('\n').forEach(function(line) {
                    var match = line.match(HEADER)
                    if(match !== null) {
                        var name = match[1]
                        var value = match[2]

                        headers[name] = value
                    }
                })

                futureResult.return({text: req.responseText, headers: headers})

            } else {
                var error = new Error('Error in request: Status '+req.status)
                error.status = req.status
                futureResult.throw(error)
            }
        }
    }

    req.onerror = function(e) {
        futureResult.throw(e)
    }


    req.open('GET', url, asynchronous)
    try {
        req.send()
    } catch(e) {
        futureResult.throw(e)
    }

    return futureResult
}

var cache = {}
var getFromCache = function(url) {
    return cache[url]
}
var setOnCache = function(url, futureResponse) {
    cache[url] = futureResponse
}

var asynchronous = true
exports.setSynchronous = function(synchronous) { // this is here so I can work around this bug in chrome: https://code.google.com/p/chromium/issues/detail?id=368444
    asynchronous = !synchronous
}

exports.cacheGet = function(fn) {
    getFromCache = fn
}
exports.cacheSet = function(fn) {
    setOnCache = fn
}
},{"async-future":25}],25:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18,"trimArguments":26}],26:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],27:[function(require,module,exports){
/* Copyright (c) 2013 Billy Tetrud - Free to use for any purpose: MIT License*/

var trimArgs = require("trimArguments")


module.exports = Future

Future.debug = false // switch this to true if you want ids and long stack traces

var curId = 0         // for ids\
function Future(value) {
	if(arguments.length > 0) {
		var f = new Future()
        f.return(value)
        return f
	} else {
        this.isResolved = false
        this.queue = []
        this.n = 0 // future depth (for preventing "too much recursion" RangeErrors)
        if(Future.debug) {
            curId++
            this.id = curId
        }
    }
}

// static methods

// has one parameter: either a bunch of futures, or a single array of futures
// returns a promise that resolves when one of them errors, or when all of them succeeds
Future.all = function() {
    if(arguments[0] instanceof Array) {
        var futures = arguments[0]
    } else {
        var futures = trimArgs(arguments)
    }

    var f = new Future()
    var results = []

    if(futures.length > 0) {
        var current = futures[0]
        futures.forEach(function(future, index) {
            current = current.then(function(v) {
                results[index] = v
                return futures[index+1]
            })
        })

        //if
        current.catch(function(e) {
            f.throw(e)
        })
        // else
        current.then(function() {
            f.return(results)
        })


    } else {
        f.return(results)
    }

    return f
}

// either used like futureWrap(function(){ ... })(arg1,arg2,etc) or
//  futureWrap(object, 'methodName')(arg1,arg2,etc)
Future.wrap = function() {
    // function
    if(arguments.length === 1) {
        var fn = arguments[0]
        var object = undefined


    // object, function
    } else {
        var object = arguments[0]
        var fn = object[arguments[1]]
    }

    return function() {
        var args = Array.prototype.slice.call(arguments)
        var future = new Future
        args.push(future.resolver())
        var me = this
        if(object) me = object
        fn.apply(me, args)
        return future
    }
}


// default
var unhandledErrorHandler = function(e) {
    setTimeout(function() {
        throw e
    },0)
}

// setup unhandled error handler
// unhandled errors happen when done is called, and  then an exception is thrown from the future
Future.error = function(handler) {
    unhandledErrorHandler = handler
}

// instance methods

// returns a value for the future (can only be executed once)
// if there are callbacks waiting on this value, they are run in the next tick
    // (ie they aren't run immediately, allowing the current thread of execution to complete)
Future.prototype.return = function(v) {
    resolve(this, 'return', v)
}
Future.prototype.throw = function(e) {
    resolve(this, 'error', e)
}

function setNext(that, future) {
    if(future !== undefined && !isLikeAFuture(future) )
        throw Error("Value returned from then or catch *not* a Future: "+future)

    resolve(that, 'next', future)
}

function wait(that, cb) {
    if(that.isResolved) {
        executeCallbacks(that, [cb])
    } else {
        that.queue.push(cb)
    }
}

// duck typing to determine if something is or isn't a future
var isLikeAFuture = Future.isLikeAFuture = function(x) {
    return x.isResolved !== undefined && x.queue !== undefined && x.then !== undefined
}

function waitOnResult(f, result, cb) {
    wait(result, function() {
        if(this.hasError) {
            f.throw(this.error)
        } else if(this.hasNext) {
            waitOnResult(f, this.next, cb)
        } else {
            try {
                setNext(f, cb(this.result))
            } catch(e) {
                f.throw(e)
            }
        }
    })
}


// cb takes one parameter - the value returned
// cb can return a Future, in which case the result of that Future is passed to next-in-chain
Future.prototype.then = function(cb) {
    var f = new Future
    f.n = this.n + 1
    wait(this, function() {
        if(this.hasError)
            f.throw(this.error)
        else if(this.hasNext)
            waitOnResult(f, this.next, cb)
        else {
            try {
                setNext(f, cb(this.result))
            } catch(e) {
                f.throw(e)
            }
        }
    })
    return f
}
// cb takes one parameter - the error caught
// cb can return a Future, in which case the result of that Future is passed to next-in-chain
Future.prototype.catch = function(cb) {
    var f = new Future
    f.n = this.n + 1
    wait(this, function() {
        if(this.hasError) {
            try {
                setNext(f, cb(this.error))
            } catch(e) {
                f.throw(e)
            }
        } else if(this.hasNext) {
            this.next.then(function(v) {
                f.return(v)
            }).catch(function(e) {
                try {
                    setNext(f, cb(e))
                } catch(e) {
                    f.throw(e)
                }
            })
        } else {
            f.return(this.result)
        }
    })
    return f
}
// cb takes no parameters
// callback's return value is ignored, but thrown exceptions propogate normally
Future.prototype.finally = function(cb) {
    var f = new Future
    f.n = this.n + 1
    wait(this, function() {
        try {
            var that = this
            if(this.hasNext) {
                this.next.then(function(v) {
                    var x = cb()
                    f.return(v)
                    return x
                }).catch(function(e) {
                    var x = cb()
                    f.throw(e)
                    return x
                }).done()
            } else if(this.hasError) {
                Future(true).then(function() {
                    return cb()
                }).then(function() {
                    f.throw(that.error)
                }).catch(function(e) {
                    f.throw(e)
                }).done()

            } else  {
                Future(true).then(function() {
                    return cb()
                }).then(function() {
                    f.return(that.result)
                }).catch(function(e) {
                    f.throw(e)
                }).done()
            }
        } catch(e) {
            f.throw(e)
        }
    })
    return f
}

// all unused futures should end with this (e.g. most then-chains)
// detatches the future so any propogated exception is thrown (so the exception isn't silently lost)
Future.prototype.done = function() {
    wait(this, function() {
        if(this.hasError) {
            unhandledErrorHandler(this.error)
        } else if(this.hasNext) {
            this.next.catch(function(e) {
                unhandledErrorHandler(e)
            })
        }
    })
}



Future.prototype.resolver = function() {
    var me = this

    return function(e,v) {
        if(e) { // error argument
            me.throw(e)
        } else {
            me.return(v)
        }
    }
}

Future.prototype.resolved = function() {
    return this.isResolved
}


function resolve(that, type, value) {
    if(that.isResolved)
        throw Error("Future resolved more than once! Resolution: "+value)

    that.isResolved = true
    that.hasError = type === 'error'
    that.hasNext = type === 'next' && value !== undefined

    if(that.hasError)
        that.error = value
    else if(that.hasNext)
        that.next = value
    else
        that.result = value

    if(that.n % 400 !== 0) { // 400 is a pretty arbitrary number - it should be set significantly lower than common maximum stack depths, and high enough to make sure performance isn't significantly affected
        executeCallbacks(that, that.queue)
    } else {
        setTimeout(function() { // this prevents too much recursion errors
            executeCallbacks(that, that.queue)
        }, 0)
    }
}

function executeCallbacks(that, callbacks) {
    if(callbacks.length > 0) {
        try {
            callbacks.forEach(function(cb) {
                cb.apply(that)
            })
        } catch(e) {
            unhandledErrorHandler(e)
        }
    }
}
},{"trimArguments":28}],28:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],29:[function(require,module,exports){
// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

void (function(root, factory) {
  if (typeof define === "function" && define.amd) {
    define(factory)
  } else if (typeof exports === "object") {
    module.exports = factory()
  } else {
    root.resolveUrl = factory()
  }
}(this, function() {

  function resolveUrl(/* ...urls */) {
    var numUrls = arguments.length

    if (numUrls === 0) {
      throw new Error("resolveUrl requires at least one argument; got none.")
    }

    var base = document.createElement("base")
    base.href = arguments[0]

    if (numUrls === 1) {
      return base.href
    }

    var head = document.getElementsByTagName("head")[0]
    head.insertBefore(base, head.firstChild)

    var a = document.createElement("a")
    var resolved

    for (var index = 1; index < numUrls; index++) {
      a.href = arguments[index]
      resolved = a.href
      base.href = resolved
    }

    head.removeChild(base)

    return resolved
  }

  return resolveUrl

}));

},{}],30:[function(require,module,exports){
// Copyright 2014 Simon Lydell

void (function(root, factory) {
  if (typeof define === "function" && define.amd) {
    define(factory)
  } else if (typeof exports === "object") {
    module.exports = factory()
  } else {
    root.sourceMappingURL = factory()
  }
}(this, function(undefined) {

  var innerRegex = /[#@] sourceMappingURL=([^\s'"]*)/
  var newlineRegex = /\r\n?|\n/

  var regex = RegExp(
    "(^|(?:" + newlineRegex.source + "))" +
    "(?:" +
      "/\\*" +
      "(?:\\s*(?:" + newlineRegex.source + ")(?://)?)?" +
      "(?:" + innerRegex.source + ")" +
      "\\s*" +
      "\\*/" +
      "|" +
      "//(?:" + innerRegex.source + ")" +
    ")" +
    "\\s*$"
  )

  function SourceMappingURL(commentSyntax) {
    this._commentSyntax = commentSyntax
  }

  SourceMappingURL.prototype.regex = regex
  SourceMappingURL.prototype._innerRegex = innerRegex
  SourceMappingURL.prototype._newlineRegex = newlineRegex

  SourceMappingURL.prototype.get = function(code) {
    var match = code.match(this.regex)
    if (!match) {
      return null
    }
    return match[2] || match[3] || ""
  }

  SourceMappingURL.prototype.set = function(code, url, commentSyntax) {
    if (!commentSyntax) {
      commentSyntax = this._commentSyntax
    }
    // Use a newline present in the code, or fall back to '\n'.
    var newline = String(code.match(this._newlineRegex) || "\n")
    var open = commentSyntax[0], close = commentSyntax[1] || ""
    code = this.remove(code)
    return code + newline + open + "# sourceMappingURL=" + url + close
  }

  SourceMappingURL.prototype.remove = function(code) {
    return code.replace(this.regex, "")
  }

  SourceMappingURL.prototype.insertBefore = function(code, string) {
    var match = code.match(this.regex)
    if (match) {
      var hasNewline = Boolean(match[1])
      return code.slice(0, match.index) +
        string +
        (hasNewline ? "" : "\n") +
        code.slice(match.index)
    } else {
      return code + string
    }
  }

  SourceMappingURL.prototype.SourceMappingURL = SourceMappingURL

  return new SourceMappingURL(["/*", " */"])

}));

},{}],31:[function(require,module,exports){
// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

// Note: source-map-resolve.js is generated from source-map-resolve-node.js and
// source-map-resolve-template.js. Only edit the two latter files, _not_
// source-map-resolve.js!

void (function(root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["source-map-url", "resolve-url"], factory)
  } else if (typeof exports === "object") {
    var sourceMappingURL = require("source-map-url")
    var resolveUrl = require("resolve-url")
    module.exports = factory(sourceMappingURL, resolveUrl)
  } else {
    root.sourceMapResolve = factory(root.sourceMappingURL, root.resolveUrl)
  }
}(this, function(sourceMappingURL, resolveUrl) {

  function callbackAsync(callback, error, result) {
    setImmediate(function() { callback(error, result) })
  }

  function sig(name, codeOrMap, url, read, callback) {
    var type = (name.indexOf("Sources") >= 0 ? "map" : "code")

    var throwError = function(num, what, got) {
      throw new Error(
        name + " requires argument " + num + " to be " + what + ". Got:\n" + got
      )
    }

    if (type === "map") {
      if (typeof codeOrMap !== "object" || codeOrMap === null) {
        throwError(1, "a source map", codeOrMap)
      }
    } else {
      if (typeof codeOrMap !== "string") {
        throwError(1, "some code", codeOrMap)
      }
    }
    if (typeof url !== "string") {
      throwError(2, "the " + type + " url", url)
    }
    if (typeof read !== "function") {
      throwError(3, "a reading function", read)
    }
    if (arguments.length === 1 + 4 && typeof callback !== "function") {
      throwError(4, "a callback function", callback)
    }
  }

  function parseMapToJSON(string) {
    return JSON.parse(string.replace(/^\)\]\}'/, ""))
  }



  function resolveSourceMap(code, codeUrl, read, callback) {
    sig("resolveSourceMap", code, codeUrl, read, callback)
    var mapData
    try {
      mapData = resolveSourceMapHelper(code, codeUrl)
    } catch (error) {
      return callbackAsync(callback, error)
    }
    if (!mapData || mapData.map) {
      return callbackAsync(callback, null, mapData)
    }
    read(mapData.url, function(error, result) {
      if (error) {
        return callback(error)
      }
      try {
        mapData.map = parseMapToJSON(String(result))
      } catch (error) {
        return callback(error)
      }
      callback(null, mapData)
    })
  }

  function resolveSourceMapSync(code, codeUrl, read) {
    sig("resolveSourceMapSync", code, codeUrl, read)
    var mapData = resolveSourceMapHelper(code, codeUrl)
    if (!mapData || mapData.map) {
      return mapData
    }
    mapData.map = parseMapToJSON(String(read(mapData.url)))
    return mapData
  }

  var dataUriRegex = /^data:([^,;]*)(;[^,;]*)*(?:,(.*))?$/
  var jsonMimeTypeRegex = /^(?:application|text)\/json$/

  function resolveSourceMapHelper(code, codeUrl) {
    var url = sourceMappingURL.get(code)
    if (!url) {
      return null
    }

    var dataUri = url.match(dataUriRegex)
    if (dataUri) {
      var mimeType = dataUri[1]
      var lastParameter = dataUri[2]
      var encoded = dataUri[3]
      if (!jsonMimeTypeRegex.test(mimeType)) {
        throw new Error("Unuseful data uri mime type: " + (mimeType || "text/plain"))
      }
      return {
        sourceMappingURL: url,
        url: null,
        sourcesRelativeTo: codeUrl,
        map: parseMapToJSON(lastParameter === ";base64" ? atob(encoded) : decodeURIComponent(encoded))
      }
    }

    var mapUrl = resolveUrl(codeUrl, url)
    return {
      sourceMappingURL: url,
      url: mapUrl,
      sourcesRelativeTo: mapUrl,
      map: null
    }
  }



  function resolveSources(map, mapUrl, read, callback) {
    sig("resolveSources", map, mapUrl, read, callback)
    var pending = map.sources.length
    var errored = false
    var sources = []

    var done = function(error) {
      if (errored) {
        return
      }
      if (error) {
        errored = true
        return callback(error)
      }
      pending--
      if (pending === 0) {
        callback(null, sources)
      }
    }

    resolveSourcesHelper(map, mapUrl, function(fullUrl, sourceContent, index) {
      if (typeof sourceContent === "string") {
        sources[index] = sourceContent
        callbackAsync(done, null)
      } else {
        read(fullUrl, function(error, result) {
          sources[index] = String(result)
          done(error)
        })
      }
    })
  }

  function resolveSourcesSync(map, mapUrl, read) {
    sig("resolveSourcesSync", map, mapUrl, read)
    var sources = []
    resolveSourcesHelper(map, mapUrl, function(fullUrl, sourceContent, index) {
      if (typeof sourceContent === "string") {
        sources[index] = sourceContent
      } else {
        sources[index] = String(read(fullUrl))
      }
    })
    return sources
  }

  var endingSlash = /\/?$/

  function resolveSourcesHelper(map, mapUrl, fn) {
    var fullUrl
    var sourceContent
    for (var index = 0, len = map.sources.length; index < len; index++) {
      if (map.sourceRoot) {
        // Make sure that the sourceRoot ends with a slash, so that `/scripts/subdir` becomes
        // `/scripts/subdir/<source>`, not `/scripts/<source>`. Pointing to a file as source root
        // does not make sense.
        fullUrl = resolveUrl(mapUrl, map.sourceRoot.replace(endingSlash, "/"), map.sources[index])
      } else {
        fullUrl = resolveUrl(mapUrl, map.sources[index])
      }
      sourceContent = (map.sourceContents || [])[index]
      fn(fullUrl, sourceContent, index)
    }
  }



  function resolve(code, codeUrl, read, callback) {
    sig("resolve", code, codeUrl, read, callback)
    resolveSourceMap(code, codeUrl, read, function(error, mapData) {
      if (error) {
        return callback(error)
      }
      if (!mapData) {
        return callback(null, null)
      }
      resolveSources(mapData.map, mapData.sourcesRelativeTo, read, function(error, sources) {
        if (error) {
          return callback(error)
        }
        mapData.sources = sources
        callback(null, mapData)
      })
    })
  }

  function resolveSync(code, codeUrl, read) {
    sig("resolveSync", code, codeUrl, read)
    var mapData = resolveSourceMapSync(code, codeUrl, read)
    if (!mapData) {
      return null
    }
    mapData.sources = resolveSourcesSync(mapData.map, mapData.sourcesRelativeTo, read)
    return mapData
  }



  return {
    resolveSourceMap:     resolveSourceMap,
    resolveSourceMapSync: resolveSourceMapSync,
    resolveSources:       resolveSources,
    resolveSourcesSync:   resolveSourcesSync,
    resolve:              resolve,
    resolveSync:          resolveSync
  }

}));

},{"resolve-url":29,"source-map-url":30}],32:[function(require,module,exports){
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = require('./source-map/source-map-generator').SourceMapGenerator;
exports.SourceMapConsumer = require('./source-map/source-map-consumer').SourceMapConsumer;
exports.SourceNode = require('./source-map/source-node').SourceNode;

},{"./source-map/source-map-consumer":37,"./source-map/source-map-generator":38,"./source-map/source-node":39}],33:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * A data structure which is a combination of an array and a set. Adding a new
   * member is O(1), testing for membership is O(1), and finding the index of an
   * element is O(1). Removing elements from the set is not supported. Only
   * strings are supported for membership.
   */
  function ArraySet() {
    this._array = [];
    this._set = {};
  }

  /**
   * Static method for creating ArraySet instances from an existing array.
   */
  ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
    var set = new ArraySet();
    for (var i = 0, len = aArray.length; i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  };

  /**
   * Add the given string to this set.
   *
   * @param String aStr
   */
  ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
    var isDuplicate = this.has(aStr);
    var idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      this._set[util.toSetString(aStr)] = idx;
    }
  };

  /**
   * Is the given string a member of this set?
   *
   * @param String aStr
   */
  ArraySet.prototype.has = function ArraySet_has(aStr) {
    return Object.prototype.hasOwnProperty.call(this._set,
                                                util.toSetString(aStr));
  };

  /**
   * What is the index of the given string in the array?
   *
   * @param String aStr
   */
  ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
    if (this.has(aStr)) {
      return this._set[util.toSetString(aStr)];
    }
    throw new Error('"' + aStr + '" is not in the set.');
  };

  /**
   * What is the element at the given index?
   *
   * @param Number aIdx
   */
  ArraySet.prototype.at = function ArraySet_at(aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error('No element indexed by ' + aIdx);
  };

  /**
   * Returns the array representation of this set (which has the proper indices
   * indicated by indexOf). Note that this is a copy of the internal array used
   * for storing the members so that no one can mess with internal state.
   */
  ArraySet.prototype.toArray = function ArraySet_toArray() {
    return this._array.slice();
  };

  exports.ArraySet = ArraySet;

});

},{"./util":40,"amdefine":41}],34:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64 = require('./base64');

  // A single base 64 digit can contain 6 bits of data. For the base 64 variable
  // length quantities we use in the source map spec, the first bit is the sign,
  // the next four bits are the actual value, and the 6th bit is the
  // continuation bit. The continuation bit tells us whether there are more
  // digits in this value following this digit.
  //
  //   Continuation
  //   |    Sign
  //   |    |
  //   V    V
  //   101011

  var VLQ_BASE_SHIFT = 5;

  // binary: 100000
  var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

  // binary: 011111
  var VLQ_BASE_MASK = VLQ_BASE - 1;

  // binary: 100000
  var VLQ_CONTINUATION_BIT = VLQ_BASE;

  /**
   * Converts from a two-complement value to a value where the sign bit is
   * is placed in the least significant bit.  For example, as decimals:
   *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
   *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
   */
  function toVLQSigned(aValue) {
    return aValue < 0
      ? ((-aValue) << 1) + 1
      : (aValue << 1) + 0;
  }

  /**
   * Converts to a two-complement value from a value where the sign bit is
   * is placed in the least significant bit.  For example, as decimals:
   *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
   *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
   */
  function fromVLQSigned(aValue) {
    var isNegative = (aValue & 1) === 1;
    var shifted = aValue >> 1;
    return isNegative
      ? -shifted
      : shifted;
  }

  /**
   * Returns the base 64 VLQ encoded value.
   */
  exports.encode = function base64VLQ_encode(aValue) {
    var encoded = "";
    var digit;

    var vlq = toVLQSigned(aValue);

    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        // There are still more digits in this value, so we must make sure the
        // continuation bit is marked.
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base64.encode(digit);
    } while (vlq > 0);

    return encoded;
  };

  /**
   * Decodes the next base 64 VLQ value from the given string and returns the
   * value and the rest of the string.
   */
  exports.decode = function base64VLQ_decode(aStr) {
    var i = 0;
    var strLen = aStr.length;
    var result = 0;
    var shift = 0;
    var continuation, digit;

    do {
      if (i >= strLen) {
        throw new Error("Expected more digits in base 64 VLQ value.");
      }
      digit = base64.decode(aStr.charAt(i++));
      continuation = !!(digit & VLQ_CONTINUATION_BIT);
      digit &= VLQ_BASE_MASK;
      result = result + (digit << shift);
      shift += VLQ_BASE_SHIFT;
    } while (continuation);

    return {
      value: fromVLQSigned(result),
      rest: aStr.slice(i)
    };
  };

});

},{"./base64":35,"amdefine":41}],35:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var charToIntMap = {};
  var intToCharMap = {};

  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    .split('')
    .forEach(function (ch, index) {
      charToIntMap[ch] = index;
      intToCharMap[index] = ch;
    });

  /**
   * Encode an integer in the range of 0 to 63 to a single base 64 digit.
   */
  exports.encode = function base64_encode(aNumber) {
    if (aNumber in intToCharMap) {
      return intToCharMap[aNumber];
    }
    throw new TypeError("Must be between 0 and 63: " + aNumber);
  };

  /**
   * Decode a single base 64 digit to an integer.
   */
  exports.decode = function base64_decode(aChar) {
    if (aChar in charToIntMap) {
      return charToIntMap[aChar];
    }
    throw new TypeError("Not a valid base 64 digit: " + aChar);
  };

});

},{"amdefine":41}],36:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * Recursive implementation of binary search.
   *
   * @param aLow Indices here and lower do not contain the needle.
   * @param aHigh Indices here and higher do not contain the needle.
   * @param aNeedle The element being searched for.
   * @param aHaystack The non-empty array being searched.
   * @param aCompare Function which takes two elements and returns -1, 0, or 1.
   */
  function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
    // This function terminates when one of the following is true:
    //
    //   1. We find the exact element we are looking for.
    //
    //   2. We did not find the exact element, but we can return the next
    //      closest element that is less than that element.
    //
    //   3. We did not find the exact element, and there is no next-closest
    //      element which is less than the one we are searching for, so we
    //      return null.
    var mid = Math.floor((aHigh - aLow) / 2) + aLow;
    var cmp = aCompare(aNeedle, aHaystack[mid], true);
    if (cmp === 0) {
      // Found the element we are looking for.
      return aHaystack[mid];
    }
    else if (cmp > 0) {
      // aHaystack[mid] is greater than our needle.
      if (aHigh - mid > 1) {
        // The element is in the upper half.
        return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
      }
      // We did not find an exact match, return the next closest one
      // (termination case 2).
      return aHaystack[mid];
    }
    else {
      // aHaystack[mid] is less than our needle.
      if (mid - aLow > 1) {
        // The element is in the lower half.
        return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
      }
      // The exact needle element was not found in this haystack. Determine if
      // we are in termination case (2) or (3) and return the appropriate thing.
      return aLow < 0
        ? null
        : aHaystack[aLow];
    }
  }

  /**
   * This is an implementation of binary search which will always try and return
   * the next lowest value checked if there is no exact hit. This is because
   * mappings between original and generated line/col pairs are single points,
   * and there is an implicit region between each of them, so a miss just means
   * that you aren't on the very start of a region.
   *
   * @param aNeedle The element you are looking for.
   * @param aHaystack The array that is being searched.
   * @param aCompare A function which takes the needle and an element in the
   *     array and returns -1, 0, or 1 depending on whether the needle is less
   *     than, equal to, or greater than the element, respectively.
   */
  exports.search = function search(aNeedle, aHaystack, aCompare) {
    return aHaystack.length > 0
      ? recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare)
      : null;
  };

});

},{"amdefine":41}],37:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');
  var binarySearch = require('./binary-search');
  var ArraySet = require('./array-set').ArraySet;
  var base64VLQ = require('./base64-vlq');

  /**
   * A SourceMapConsumer instance represents a parsed source map which we can
   * query for information about the original file positions by giving it a file
   * position in the generated source.
   *
   * The only parameter is the raw source map (either as a JSON string, or
   * already parsed to an object). According to the spec, source maps have the
   * following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - sources: An array of URLs to the original source files.
   *   - names: An array of identifiers which can be referrenced by individual mappings.
   *   - sourceRoot: Optional. The URL root from which all sources are relative.
   *   - sourcesContent: Optional. An array of contents of the original source files.
   *   - mappings: A string of base64 VLQs which contain the actual mappings.
   *   - file: Optional. The generated file this source map is associated with.
   *
   * Here is an example source map, taken from the source map spec[0]:
   *
   *     {
   *       version : 3,
   *       file: "out.js",
   *       sourceRoot : "",
   *       sources: ["foo.js", "bar.js"],
   *       names: ["src", "maps", "are", "fun"],
   *       mappings: "AA,AB;;ABCDE;"
   *     }
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
   */
  function SourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    var version = util.getArg(sourceMap, 'version');
    var sources = util.getArg(sourceMap, 'sources');
    // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
    // requires the array) to play nice here.
    var names = util.getArg(sourceMap, 'names', []);
    var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
    var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
    var mappings = util.getArg(sourceMap, 'mappings');
    var file = util.getArg(sourceMap, 'file', null);

    // Once again, Sass deviates from the spec and supplies the version as a
    // string rather than a number, so we use loose equality checking here.
    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    // Pass `true` below to allow duplicate names and sources. While source maps
    // are intended to be compressed and deduplicated, the TypeScript compiler
    // sometimes generates source maps with duplicates in them. See Github issue
    // #72 and bugzil.la/889492.
    this._names = ArraySet.fromArray(names, true);
    this._sources = ArraySet.fromArray(sources, true);

    this.sourceRoot = sourceRoot;
    this.sourcesContent = sourcesContent;
    this._mappings = mappings;
    this.file = file;
  }

  /**
   * Create a SourceMapConsumer from a SourceMapGenerator.
   *
   * @param SourceMapGenerator aSourceMap
   *        The source map that will be consumed.
   * @returns SourceMapConsumer
   */
  SourceMapConsumer.fromSourceMap =
    function SourceMapConsumer_fromSourceMap(aSourceMap) {
      var smc = Object.create(SourceMapConsumer.prototype);

      smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
      smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
      smc.sourceRoot = aSourceMap._sourceRoot;
      smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                              smc.sourceRoot);
      smc.file = aSourceMap._file;

      smc.__generatedMappings = aSourceMap._mappings.slice()
        .sort(util.compareByGeneratedPositions);
      smc.__originalMappings = aSourceMap._mappings.slice()
        .sort(util.compareByOriginalPositions);

      return smc;
    };

  /**
   * The version of the source mapping spec that we are consuming.
   */
  SourceMapConsumer.prototype._version = 3;

  /**
   * The list of original sources.
   */
  Object.defineProperty(SourceMapConsumer.prototype, 'sources', {
    get: function () {
      return this._sources.toArray().map(function (s) {
        return this.sourceRoot ? util.join(this.sourceRoot, s) : s;
      }, this);
    }
  });

  // `__generatedMappings` and `__originalMappings` are arrays that hold the
  // parsed mapping coordinates from the source map's "mappings" attribute. They
  // are lazily instantiated, accessed via the `_generatedMappings` and
  // `_originalMappings` getters respectively, and we only parse the mappings
  // and create these arrays once queried for a source location. We jump through
  // these hoops because there can be many thousands of mappings, and parsing
  // them is expensive, so we only want to do it if we must.
  //
  // Each object in the arrays is of the form:
  //
  //     {
  //       generatedLine: The line number in the generated code,
  //       generatedColumn: The column number in the generated code,
  //       source: The path to the original source file that generated this
  //               chunk of code,
  //       originalLine: The line number in the original source that
  //                     corresponds to this chunk of generated code,
  //       originalColumn: The column number in the original source that
  //                       corresponds to this chunk of generated code,
  //       name: The name of the original symbol which generated this chunk of
  //             code.
  //     }
  //
  // All properties except for `generatedLine` and `generatedColumn` can be
  // `null`.
  //
  // `_generatedMappings` is ordered by the generated positions.
  //
  // `_originalMappings` is ordered by the original positions.

  SourceMapConsumer.prototype.__generatedMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
    get: function () {
      if (!this.__generatedMappings) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__generatedMappings;
    }
  });

  SourceMapConsumer.prototype.__originalMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
    get: function () {
      if (!this.__originalMappings) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__originalMappings;
    }
  });

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  SourceMapConsumer.prototype._parseMappings =
    function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      var generatedLine = 1;
      var previousGeneratedColumn = 0;
      var previousOriginalLine = 0;
      var previousOriginalColumn = 0;
      var previousSource = 0;
      var previousName = 0;
      var mappingSeparator = /^[,;]/;
      var str = aStr;
      var mapping;
      var temp;

      while (str.length > 0) {
        if (str.charAt(0) === ';') {
          generatedLine++;
          str = str.slice(1);
          previousGeneratedColumn = 0;
        }
        else if (str.charAt(0) === ',') {
          str = str.slice(1);
        }
        else {
          mapping = {};
          mapping.generatedLine = generatedLine;

          // Generated column.
          temp = base64VLQ.decode(str);
          mapping.generatedColumn = previousGeneratedColumn + temp.value;
          previousGeneratedColumn = mapping.generatedColumn;
          str = temp.rest;

          if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
            // Original source.
            temp = base64VLQ.decode(str);
            mapping.source = this._sources.at(previousSource + temp.value);
            previousSource += temp.value;
            str = temp.rest;
            if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
              throw new Error('Found a source, but no line and column');
            }

            // Original line.
            temp = base64VLQ.decode(str);
            mapping.originalLine = previousOriginalLine + temp.value;
            previousOriginalLine = mapping.originalLine;
            // Lines are stored 0-based
            mapping.originalLine += 1;
            str = temp.rest;
            if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
              throw new Error('Found a source and line, but no column');
            }

            // Original column.
            temp = base64VLQ.decode(str);
            mapping.originalColumn = previousOriginalColumn + temp.value;
            previousOriginalColumn = mapping.originalColumn;
            str = temp.rest;

            if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
              // Original name.
              temp = base64VLQ.decode(str);
              mapping.name = this._names.at(previousName + temp.value);
              previousName += temp.value;
              str = temp.rest;
            }
          }

          this.__generatedMappings.push(mapping);
          if (typeof mapping.originalLine === 'number') {
            this.__originalMappings.push(mapping);
          }
        }
      }

      this.__generatedMappings.sort(util.compareByGeneratedPositions);
      this.__originalMappings.sort(util.compareByOriginalPositions);
    };

  /**
   * Find the mapping that best matches the hypothetical "needle" mapping that
   * we are searching for in the given "haystack" of mappings.
   */
  SourceMapConsumer.prototype._findMapping =
    function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                           aColumnName, aComparator) {
      // To return the position we are searching for, we must first find the
      // mapping for the given position and then return the opposite position it
      // points to. Because the mappings are sorted, we can use binary search to
      // find the best mapping.

      if (aNeedle[aLineName] <= 0) {
        throw new TypeError('Line must be greater than or equal to 1, got '
                            + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError('Column must be greater than or equal to 0, got '
                            + aNeedle[aColumnName]);
      }

      return binarySearch.search(aNeedle, aMappings, aComparator);
    };

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.
   *   - column: The column number in the generated source.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.
   *   - column: The column number in the original source, or null.
   *   - name: The original identifier, or null.
   */
  SourceMapConsumer.prototype.originalPositionFor =
    function SourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };

      var mapping = this._findMapping(needle,
                                      this._generatedMappings,
                                      "generatedLine",
                                      "generatedColumn",
                                      util.compareByGeneratedPositions);

      if (mapping && mapping.generatedLine === needle.generatedLine) {
        var source = util.getArg(mapping, 'source', null);
        if (source && this.sourceRoot) {
          source = util.join(this.sourceRoot, source);
        }
        return {
          source: source,
          line: util.getArg(mapping, 'originalLine', null),
          column: util.getArg(mapping, 'originalColumn', null),
          name: util.getArg(mapping, 'name', null)
        };
      }

      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * availible.
   */
  SourceMapConsumer.prototype.sourceContentFor =
    function SourceMapConsumer_sourceContentFor(aSource) {
      if (!this.sourcesContent) {
        return null;
      }

      if (this.sourceRoot) {
        aSource = util.relative(this.sourceRoot, aSource);
      }

      if (this._sources.has(aSource)) {
        return this.sourcesContent[this._sources.indexOf(aSource)];
      }

      var url;
      if (this.sourceRoot
          && (url = util.urlParse(this.sourceRoot))) {
        // XXX: file:// URIs and absolute paths lead to unexpected behavior for
        // many users. We can help them out when they expect file:// URIs to
        // behave like it would if they were running a local HTTP server. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
        var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
        if (url.scheme == "file"
            && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
        }

        if ((!url.path || url.path == "/")
            && this._sources.has("/" + aSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + aSource)];
        }
      }

      throw new Error('"' + aSource + '" is not in the SourceMap.');
    };

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: The column number in the original source.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  SourceMapConsumer.prototype.generatedPositionFor =
    function SourceMapConsumer_generatedPositionFor(aArgs) {
      var needle = {
        source: util.getArg(aArgs, 'source'),
        originalLine: util.getArg(aArgs, 'line'),
        originalColumn: util.getArg(aArgs, 'column')
      };

      if (this.sourceRoot) {
        needle.source = util.relative(this.sourceRoot, needle.source);
      }

      var mapping = this._findMapping(needle,
                                      this._originalMappings,
                                      "originalLine",
                                      "originalColumn",
                                      util.compareByOriginalPositions);

      if (mapping) {
        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null)
        };
      }

      return {
        line: null,
        column: null
      };
    };

  SourceMapConsumer.GENERATED_ORDER = 1;
  SourceMapConsumer.ORIGINAL_ORDER = 2;

  /**
   * Iterate over each mapping between an original source/line/column and a
   * generated line/column in this source map.
   *
   * @param Function aCallback
   *        The function that is called with each mapping.
   * @param Object aContext
   *        Optional. If specified, this object will be the value of `this` every
   *        time that `aCallback` is called.
   * @param aOrder
   *        Either `SourceMapConsumer.GENERATED_ORDER` or
   *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
   *        iterate over the mappings sorted by the generated file's line/column
   *        order or the original's source/line/column order, respectively. Defaults to
   *        `SourceMapConsumer.GENERATED_ORDER`.
   */
  SourceMapConsumer.prototype.eachMapping =
    function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
      var context = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

      var mappings;
      switch (order) {
      case SourceMapConsumer.GENERATED_ORDER:
        mappings = this._generatedMappings;
        break;
      case SourceMapConsumer.ORIGINAL_ORDER:
        mappings = this._originalMappings;
        break;
      default:
        throw new Error("Unknown order of iteration.");
      }

      var sourceRoot = this.sourceRoot;
      mappings.map(function (mapping) {
        var source = mapping.source;
        if (source && sourceRoot) {
          source = util.join(sourceRoot, source);
        }
        return {
          source: source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name
        };
      }).forEach(aCallback, context);
    };

  exports.SourceMapConsumer = SourceMapConsumer;

});

},{"./array-set":33,"./base64-vlq":34,"./binary-search":36,"./util":40,"amdefine":41}],38:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64VLQ = require('./base64-vlq');
  var util = require('./util');
  var ArraySet = require('./array-set').ArraySet;

  /**
   * An instance of the SourceMapGenerator represents a source map which is
   * being built incrementally. You may pass an object with the following
   * properties:
   *
   *   - file: The filename of the generated source.
   *   - sourceRoot: A root for all relative URLs in this source map.
   */
  function SourceMapGenerator(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = util.getArg(aArgs, 'file', null);
    this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
    this._sources = new ArraySet();
    this._names = new ArraySet();
    this._mappings = [];
    this._sourcesContents = null;
  }

  SourceMapGenerator.prototype._version = 3;

  /**
   * Creates a new SourceMapGenerator based on a SourceMapConsumer
   *
   * @param aSourceMapConsumer The SourceMap.
   */
  SourceMapGenerator.fromSourceMap =
    function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
      var sourceRoot = aSourceMapConsumer.sourceRoot;
      var generator = new SourceMapGenerator({
        file: aSourceMapConsumer.file,
        sourceRoot: sourceRoot
      });
      aSourceMapConsumer.eachMapping(function (mapping) {
        var newMapping = {
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          }
        };

        if (mapping.source) {
          newMapping.source = mapping.source;
          if (sourceRoot) {
            newMapping.source = util.relative(sourceRoot, newMapping.source);
          }

          newMapping.original = {
            line: mapping.originalLine,
            column: mapping.originalColumn
          };

          if (mapping.name) {
            newMapping.name = mapping.name;
          }
        }

        generator.addMapping(newMapping);
      });
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content) {
          generator.setSourceContent(sourceFile, content);
        }
      });
      return generator;
    };

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   *   - generated: An object with the generated line and column positions.
   *   - original: An object with the original line and column positions.
   *   - source: The original source file (relative to the sourceRoot).
   *   - name: An optional original token name for this mapping.
   */
  SourceMapGenerator.prototype.addMapping =
    function SourceMapGenerator_addMapping(aArgs) {
      var generated = util.getArg(aArgs, 'generated');
      var original = util.getArg(aArgs, 'original', null);
      var source = util.getArg(aArgs, 'source', null);
      var name = util.getArg(aArgs, 'name', null);

      this._validateMapping(generated, original, source, name);

      if (source && !this._sources.has(source)) {
        this._sources.add(source);
      }

      if (name && !this._names.has(name)) {
        this._names.add(name);
      }

      this._mappings.push({
        generatedLine: generated.line,
        generatedColumn: generated.column,
        originalLine: original != null && original.line,
        originalColumn: original != null && original.column,
        source: source,
        name: name
      });
    };

  /**
   * Set the source content for a source file.
   */
  SourceMapGenerator.prototype.setSourceContent =
    function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
      var source = aSourceFile;
      if (this._sourceRoot) {
        source = util.relative(this._sourceRoot, source);
      }

      if (aSourceContent !== null) {
        // Add the source content to the _sourcesContents map.
        // Create a new _sourcesContents map if the property is null.
        if (!this._sourcesContents) {
          this._sourcesContents = {};
        }
        this._sourcesContents[util.toSetString(source)] = aSourceContent;
      } else {
        // Remove the source file from the _sourcesContents map.
        // If the _sourcesContents map is empty, set the property to null.
        delete this._sourcesContents[util.toSetString(source)];
        if (Object.keys(this._sourcesContents).length === 0) {
          this._sourcesContents = null;
        }
      }
    };

  /**
   * Applies the mappings of a sub-source-map for a specific source file to the
   * source map being generated. Each mapping to the supplied source file is
   * rewritten using the supplied source map. Note: The resolution for the
   * resulting mappings is the minimium of this map and the supplied map.
   *
   * @param aSourceMapConsumer The source map to be applied.
   * @param aSourceFile Optional. The filename of the source file.
   *        If omitted, SourceMapConsumer's file property will be used.
   * @param aSourceMapPath Optional. The dirname of the path to the source map
   *        to be applied. If relative, it is relative to the SourceMapConsumer.
   *        This parameter is needed when the two source maps aren't in the same
   *        directory, and the source map to be applied contains relative source
   *        paths. If so, those relative source paths need to be rewritten
   *        relative to the SourceMapGenerator.
   */
  SourceMapGenerator.prototype.applySourceMap =
    function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
      // If aSourceFile is omitted, we will use the file property of the SourceMap
      if (!aSourceFile) {
        if (!aSourceMapConsumer.file) {
          throw new Error(
            'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
            'or the source map\'s "file" property. Both were omitted.'
          );
        }
        aSourceFile = aSourceMapConsumer.file;
      }
      var sourceRoot = this._sourceRoot;
      // Make "aSourceFile" relative if an absolute Url is passed.
      if (sourceRoot) {
        aSourceFile = util.relative(sourceRoot, aSourceFile);
      }
      // Applying the SourceMap can add and remove items from the sources and
      // the names array.
      var newSources = new ArraySet();
      var newNames = new ArraySet();

      // Find mappings for the "aSourceFile"
      this._mappings.forEach(function (mapping) {
        if (mapping.source === aSourceFile && mapping.originalLine) {
          // Check if it can be mapped by the source map, then update the mapping.
          var original = aSourceMapConsumer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn
          });
          if (original.source !== null) {
            // Copy mapping
            mapping.source = original.source;
            if (aSourceMapPath) {
              mapping.source = util.join(aSourceMapPath, mapping.source)
            }
            if (sourceRoot) {
              mapping.source = util.relative(sourceRoot, mapping.source);
            }
            mapping.originalLine = original.line;
            mapping.originalColumn = original.column;
            if (original.name !== null && mapping.name !== null) {
              // Only use the identifier name if it's an identifier
              // in both SourceMaps
              mapping.name = original.name;
            }
          }
        }

        var source = mapping.source;
        if (source && !newSources.has(source)) {
          newSources.add(source);
        }

        var name = mapping.name;
        if (name && !newNames.has(name)) {
          newNames.add(name);
        }

      }, this);
      this._sources = newSources;
      this._names = newNames;

      // Copy sourcesContents of applied map.
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content) {
          if (sourceRoot) {
            sourceFile = util.relative(sourceRoot, sourceFile);
          }
          this.setSourceContent(sourceFile, content);
        }
      }, this);
    };

  /**
   * A mapping can have one of the three levels of data:
   *
   *   1. Just the generated position.
   *   2. The Generated position, original position, and original source.
   *   3. Generated and original position, original source, as well as a name
   *      token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  SourceMapGenerator.prototype._validateMapping =
    function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                                aName) {
      if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
          && aGenerated.line > 0 && aGenerated.column >= 0
          && !aOriginal && !aSource && !aName) {
        // Case 1.
        return;
      }
      else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
               && aOriginal && 'line' in aOriginal && 'column' in aOriginal
               && aGenerated.line > 0 && aGenerated.column >= 0
               && aOriginal.line > 0 && aOriginal.column >= 0
               && aSource) {
        // Cases 2 and 3.
        return;
      }
      else {
        throw new Error('Invalid mapping: ' + JSON.stringify({
          generated: aGenerated,
          source: aSource,
          original: aOriginal,
          name: aName
        }));
      }
    };

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  SourceMapGenerator.prototype._serializeMappings =
    function SourceMapGenerator_serializeMappings() {
      var previousGeneratedColumn = 0;
      var previousGeneratedLine = 1;
      var previousOriginalColumn = 0;
      var previousOriginalLine = 0;
      var previousName = 0;
      var previousSource = 0;
      var result = '';
      var mapping;

      // The mappings must be guaranteed to be in sorted order before we start
      // serializing them or else the generated line numbers (which are defined
      // via the ';' separators) will be all messed up. Note: it might be more
      // performant to maintain the sorting as we insert them, rather than as we
      // serialize them, but the big O is the same either way.
      this._mappings.sort(util.compareByGeneratedPositions);

      for (var i = 0, len = this._mappings.length; i < len; i++) {
        mapping = this._mappings[i];

        if (mapping.generatedLine !== previousGeneratedLine) {
          previousGeneratedColumn = 0;
          while (mapping.generatedLine !== previousGeneratedLine) {
            result += ';';
            previousGeneratedLine++;
          }
        }
        else {
          if (i > 0) {
            if (!util.compareByGeneratedPositions(mapping, this._mappings[i - 1])) {
              continue;
            }
            result += ',';
          }
        }

        result += base64VLQ.encode(mapping.generatedColumn
                                   - previousGeneratedColumn);
        previousGeneratedColumn = mapping.generatedColumn;

        if (mapping.source) {
          result += base64VLQ.encode(this._sources.indexOf(mapping.source)
                                     - previousSource);
          previousSource = this._sources.indexOf(mapping.source);

          // lines are stored 0-based in SourceMap spec version 3
          result += base64VLQ.encode(mapping.originalLine - 1
                                     - previousOriginalLine);
          previousOriginalLine = mapping.originalLine - 1;

          result += base64VLQ.encode(mapping.originalColumn
                                     - previousOriginalColumn);
          previousOriginalColumn = mapping.originalColumn;

          if (mapping.name) {
            result += base64VLQ.encode(this._names.indexOf(mapping.name)
                                       - previousName);
            previousName = this._names.indexOf(mapping.name);
          }
        }
      }

      return result;
    };

  SourceMapGenerator.prototype._generateSourcesContent =
    function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
      return aSources.map(function (source) {
        if (!this._sourcesContents) {
          return null;
        }
        if (aSourceRoot) {
          source = util.relative(aSourceRoot, source);
        }
        var key = util.toSetString(source);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents,
                                                    key)
          ? this._sourcesContents[key]
          : null;
      }, this);
    };

  /**
   * Externalize the source map.
   */
  SourceMapGenerator.prototype.toJSON =
    function SourceMapGenerator_toJSON() {
      var map = {
        version: this._version,
        file: this._file,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings()
      };
      if (this._sourceRoot) {
        map.sourceRoot = this._sourceRoot;
      }
      if (this._sourcesContents) {
        map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
      }

      return map;
    };

  /**
   * Render the source map being generated to a string.
   */
  SourceMapGenerator.prototype.toString =
    function SourceMapGenerator_toString() {
      return JSON.stringify(this);
    };

  exports.SourceMapGenerator = SourceMapGenerator;

});

},{"./array-set":33,"./base64-vlq":34,"./util":40,"amdefine":41}],39:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
  var util = require('./util');

  /**
   * SourceNodes provide a way to abstract over interpolating/concatenating
   * snippets of generated JavaScript source code while maintaining the line and
   * column information associated with the original source code.
   *
   * @param aLine The original line number.
   * @param aColumn The original column number.
   * @param aSource The original source's filename.
   * @param aChunks Optional. An array of strings which are snippets of
   *        generated JS, or other SourceNodes.
   * @param aName The original identifier.
   */
  function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
    this.children = [];
    this.sourceContents = {};
    this.line = aLine === undefined ? null : aLine;
    this.column = aColumn === undefined ? null : aColumn;
    this.source = aSource === undefined ? null : aSource;
    this.name = aName === undefined ? null : aName;
    if (aChunks != null) this.add(aChunks);
  }

  /**
   * Creates a SourceNode from generated code and a SourceMapConsumer.
   *
   * @param aGeneratedCode The generated code
   * @param aSourceMapConsumer The SourceMap for the generated code
   */
  SourceNode.fromStringWithSourceMap =
    function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer) {
      // The SourceNode we want to fill with the generated code
      // and the SourceMap
      var node = new SourceNode();

      // The generated code
      // Processed fragments are removed from this array.
      var remainingLines = aGeneratedCode.split('\n');

      // We need to remember the position of "remainingLines"
      var lastGeneratedLine = 1, lastGeneratedColumn = 0;

      // The generate SourceNodes we need a code range.
      // To extract it current and last mapping is used.
      // Here we store the last mapping.
      var lastMapping = null;

      aSourceMapConsumer.eachMapping(function (mapping) {
        if (lastMapping !== null) {
          // We add the code from "lastMapping" to "mapping":
          // First check if there is a new line in between.
          if (lastGeneratedLine < mapping.generatedLine) {
            var code = "";
            // Associate first line with "lastMapping"
            addMappingWithCode(lastMapping, remainingLines.shift() + "\n");
            lastGeneratedLine++;
            lastGeneratedColumn = 0;
            // The remaining code is added without mapping
          } else {
            // There is no new line in between.
            // Associate the code between "lastGeneratedColumn" and
            // "mapping.generatedColumn" with "lastMapping"
            var nextLine = remainingLines[0];
            var code = nextLine.substr(0, mapping.generatedColumn -
                                          lastGeneratedColumn);
            remainingLines[0] = nextLine.substr(mapping.generatedColumn -
                                                lastGeneratedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
            addMappingWithCode(lastMapping, code);
            // No more remaining code, continue
            lastMapping = mapping;
            return;
          }
        }
        // We add the generated code until the first mapping
        // to the SourceNode without any mapping.
        // Each line is added as separate string.
        while (lastGeneratedLine < mapping.generatedLine) {
          node.add(remainingLines.shift() + "\n");
          lastGeneratedLine++;
        }
        if (lastGeneratedColumn < mapping.generatedColumn) {
          var nextLine = remainingLines[0];
          node.add(nextLine.substr(0, mapping.generatedColumn));
          remainingLines[0] = nextLine.substr(mapping.generatedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
        }
        lastMapping = mapping;
      }, this);
      // We have processed all mappings.
      if (remainingLines.length > 0) {
        if (lastMapping) {
          // Associate the remaining code in the current line with "lastMapping"
          var lastLine = remainingLines.shift();
          if (remainingLines.length > 0) lastLine += "\n";
          addMappingWithCode(lastMapping, lastLine);
        }
        // and add the remaining lines without any mapping
        node.add(remainingLines.join("\n"));
      }

      // Copy sourcesContent into SourceNode
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content) {
          node.setSourceContent(sourceFile, content);
        }
      });

      return node;

      function addMappingWithCode(mapping, code) {
        if (mapping === null || mapping.source === undefined) {
          node.add(code);
        } else {
          node.add(new SourceNode(mapping.originalLine,
                                  mapping.originalColumn,
                                  mapping.source,
                                  code,
                                  mapping.name));
        }
      }
    };

  /**
   * Add a chunk of generated JS to this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.add = function SourceNode_add(aChunk) {
    if (Array.isArray(aChunk)) {
      aChunk.forEach(function (chunk) {
        this.add(chunk);
      }, this);
    }
    else if (aChunk instanceof SourceNode || typeof aChunk === "string") {
      if (aChunk) {
        this.children.push(aChunk);
      }
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Add a chunk of generated JS to the beginning of this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
    if (Array.isArray(aChunk)) {
      for (var i = aChunk.length-1; i >= 0; i--) {
        this.prepend(aChunk[i]);
      }
    }
    else if (aChunk instanceof SourceNode || typeof aChunk === "string") {
      this.children.unshift(aChunk);
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Walk over the tree of JS snippets in this node and its children. The
   * walking function is called once for each snippet of JS and is passed that
   * snippet and the its original associated source's line/column location.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walk = function SourceNode_walk(aFn) {
    var chunk;
    for (var i = 0, len = this.children.length; i < len; i++) {
      chunk = this.children[i];
      if (chunk instanceof SourceNode) {
        chunk.walk(aFn);
      }
      else {
        if (chunk !== '') {
          aFn(chunk, { source: this.source,
                       line: this.line,
                       column: this.column,
                       name: this.name });
        }
      }
    }
  };

  /**
   * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
   * each of `this.children`.
   *
   * @param aSep The separator.
   */
  SourceNode.prototype.join = function SourceNode_join(aSep) {
    var newChildren;
    var i;
    var len = this.children.length;
    if (len > 0) {
      newChildren = [];
      for (i = 0; i < len-1; i++) {
        newChildren.push(this.children[i]);
        newChildren.push(aSep);
      }
      newChildren.push(this.children[i]);
      this.children = newChildren;
    }
    return this;
  };

  /**
   * Call String.prototype.replace on the very right-most source snippet. Useful
   * for trimming whitespace from the end of a source node, etc.
   *
   * @param aPattern The pattern to replace.
   * @param aReplacement The thing to replace the pattern with.
   */
  SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
    var lastChild = this.children[this.children.length - 1];
    if (lastChild instanceof SourceNode) {
      lastChild.replaceRight(aPattern, aReplacement);
    }
    else if (typeof lastChild === 'string') {
      this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    }
    else {
      this.children.push(''.replace(aPattern, aReplacement));
    }
    return this;
  };

  /**
   * Set the source content for a source file. This will be added to the SourceMapGenerator
   * in the sourcesContent field.
   *
   * @param aSourceFile The filename of the source file
   * @param aSourceContent The content of the source file
   */
  SourceNode.prototype.setSourceContent =
    function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
      this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    };

  /**
   * Walk over the tree of SourceNodes. The walking function is called for each
   * source file content and is passed the filename and source content.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walkSourceContents =
    function SourceNode_walkSourceContents(aFn) {
      for (var i = 0, len = this.children.length; i < len; i++) {
        if (this.children[i] instanceof SourceNode) {
          this.children[i].walkSourceContents(aFn);
        }
      }

      var sources = Object.keys(this.sourceContents);
      for (var i = 0, len = sources.length; i < len; i++) {
        aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
      }
    };

  /**
   * Return the string representation of this source node. Walks over the tree
   * and concatenates all the various snippets together to one string.
   */
  SourceNode.prototype.toString = function SourceNode_toString() {
    var str = "";
    this.walk(function (chunk) {
      str += chunk;
    });
    return str;
  };

  /**
   * Returns the string representation of this source node along with a source
   * map.
   */
  SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
    var generated = {
      code: "",
      line: 1,
      column: 0
    };
    var map = new SourceMapGenerator(aArgs);
    var sourceMappingActive = false;
    var lastOriginalSource = null;
    var lastOriginalLine = null;
    var lastOriginalColumn = null;
    var lastOriginalName = null;
    this.walk(function (chunk, original) {
      generated.code += chunk;
      if (original.source !== null
          && original.line !== null
          && original.column !== null) {
        if(lastOriginalSource !== original.source
           || lastOriginalLine !== original.line
           || lastOriginalColumn !== original.column
           || lastOriginalName !== original.name) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
        lastOriginalSource = original.source;
        lastOriginalLine = original.line;
        lastOriginalColumn = original.column;
        lastOriginalName = original.name;
        sourceMappingActive = true;
      } else if (sourceMappingActive) {
        map.addMapping({
          generated: {
            line: generated.line,
            column: generated.column
          }
        });
        lastOriginalSource = null;
        sourceMappingActive = false;
      }
      chunk.split('').forEach(function (ch, idx, array) {
        if (ch === '\n') {
          generated.line++;
          generated.column = 0;
          // Mappings end at eol
          if (idx + 1 === array.length) {
            lastOriginalSource = null;
            sourceMappingActive = false;
          } else if (sourceMappingActive) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
        } else {
          generated.column++;
        }
      });
    });
    this.walkSourceContents(function (sourceFile, sourceContent) {
      map.setSourceContent(sourceFile, sourceContent);
    });

    return { code: generated.code, map: map };
  };

  exports.SourceNode = SourceNode;

});

},{"./source-map-generator":38,"./util":40,"amdefine":41}],40:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * This is a helper function for getting values from parameter/options
   * objects.
   *
   * @param args The object we are extracting values from
   * @param name The name of the property we are getting.
   * @param defaultValue An optional value to return if the property is missing
   * from the object. If this is not specified and the property is missing, an
   * error will be thrown.
   */
  function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
      return aArgs[aName];
    } else if (arguments.length === 3) {
      return aDefaultValue;
    } else {
      throw new Error('"' + aName + '" is a required argument.');
    }
  }
  exports.getArg = getArg;

  var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
  var dataUrlRegexp = /^data:.+\,.+$/;

  function urlParse(aUrl) {
    var match = aUrl.match(urlRegexp);
    if (!match) {
      return null;
    }
    return {
      scheme: match[1],
      auth: match[2],
      host: match[3],
      port: match[4],
      path: match[5]
    };
  }
  exports.urlParse = urlParse;

  function urlGenerate(aParsedUrl) {
    var url = '';
    if (aParsedUrl.scheme) {
      url += aParsedUrl.scheme + ':';
    }
    url += '//';
    if (aParsedUrl.auth) {
      url += aParsedUrl.auth + '@';
    }
    if (aParsedUrl.host) {
      url += aParsedUrl.host;
    }
    if (aParsedUrl.port) {
      url += ":" + aParsedUrl.port
    }
    if (aParsedUrl.path) {
      url += aParsedUrl.path;
    }
    return url;
  }
  exports.urlGenerate = urlGenerate;

  /**
   * Normalizes a path, or the path portion of a URL:
   *
   * - Replaces consequtive slashes with one slash.
   * - Removes unnecessary '.' parts.
   * - Removes unnecessary '<dir>/..' parts.
   *
   * Based on code in the Node.js 'path' core module.
   *
   * @param aPath The path or url to normalize.
   */
  function normalize(aPath) {
    var path = aPath;
    var url = urlParse(aPath);
    if (url) {
      if (!url.path) {
        return aPath;
      }
      path = url.path;
    }
    var isAbsolute = (path.charAt(0) === '/');

    var parts = path.split(/\/+/);
    for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
      part = parts[i];
      if (part === '.') {
        parts.splice(i, 1);
      } else if (part === '..') {
        up++;
      } else if (up > 0) {
        if (part === '') {
          // The first part is blank if the path is absolute. Trying to go
          // above the root is a no-op. Therefore we can remove all '..' parts
          // directly after the root.
          parts.splice(i + 1, up);
          up = 0;
        } else {
          parts.splice(i, 2);
          up--;
        }
      }
    }
    path = parts.join('/');

    if (path === '') {
      path = isAbsolute ? '/' : '.';
    }

    if (url) {
      url.path = path;
      return urlGenerate(url);
    }
    return path;
  }
  exports.normalize = normalize;

  /**
   * Joins two paths/URLs.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be joined with the root.
   *
   * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
   *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
   *   first.
   * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
   *   is updated with the result and aRoot is returned. Otherwise the result
   *   is returned.
   *   - If aPath is absolute, the result is aPath.
   *   - Otherwise the two paths are joined with a slash.
   * - Joining for example 'http://' and 'www.example.com' is also supported.
   */
  function join(aRoot, aPath) {
    var aPathUrl = urlParse(aPath);
    var aRootUrl = urlParse(aRoot);
    if (aRootUrl) {
      aRoot = aRootUrl.path || '/';
    }

    // `join(foo, '//www.example.org')`
    if (aPathUrl && !aPathUrl.scheme) {
      if (aRootUrl) {
        aPathUrl.scheme = aRootUrl.scheme;
      }
      return urlGenerate(aPathUrl);
    }

    if (aPathUrl || aPath.match(dataUrlRegexp)) {
      return aPath;
    }

    // `join('http://', 'www.example.com')`
    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
      aRootUrl.host = aPath;
      return urlGenerate(aRootUrl);
    }

    var joined = aPath.charAt(0) === '/'
      ? aPath
      : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

    if (aRootUrl) {
      aRootUrl.path = joined;
      return urlGenerate(aRootUrl);
    }
    return joined;
  }
  exports.join = join;

  /**
   * Because behavior goes wacky when you set `__proto__` on objects, we
   * have to prefix all the strings in our set with an arbitrary character.
   *
   * See https://github.com/mozilla/source-map/pull/31 and
   * https://github.com/mozilla/source-map/issues/30
   *
   * @param String aStr
   */
  function toSetString(aStr) {
    return '$' + aStr;
  }
  exports.toSetString = toSetString;

  function fromSetString(aStr) {
    return aStr.substr(1);
  }
  exports.fromSetString = fromSetString;

  function relative(aRoot, aPath) {
    aRoot = aRoot.replace(/\/$/, '');

    var url = urlParse(aRoot);
    if (aPath.charAt(0) == "/" && url && url.path == "/") {
      return aPath.slice(1);
    }

    return aPath.indexOf(aRoot + '/') === 0
      ? aPath.substr(aRoot.length + 1)
      : aPath;
  }
  exports.relative = relative;

  function strcmp(aStr1, aStr2) {
    var s1 = aStr1 || "";
    var s2 = aStr2 || "";
    return (s1 > s2) - (s1 < s2);
  }

  /**
   * Comparator between two mappings where the original positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same original source/line/column, but different generated
   * line and column the same. Useful when searching for a mapping with a
   * stubbed out mapping.
   */
  function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    var cmp;

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp || onlyCompareOriginal) {
      return cmp;
    }

    cmp = strcmp(mappingA.name, mappingB.name);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp) {
      return cmp;
    }

    return mappingA.generatedColumn - mappingB.generatedColumn;
  };
  exports.compareByOriginalPositions = compareByOriginalPositions;

  /**
   * Comparator between two mappings where the generated positions are
   * compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same generated line and column, but different
   * source/name/original line and column the same. Useful when searching for a
   * mapping with a stubbed out mapping.
   */
  function compareByGeneratedPositions(mappingA, mappingB, onlyCompareGenerated) {
    var cmp;

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp || onlyCompareGenerated) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  };
  exports.compareByGeneratedPositions = compareByGeneratedPositions;

});

},{"amdefine":41}],41:[function(require,module,exports){
(function (process,__filename){
/** vim: et:ts=4:sw=4:sts=4
 * @license amdefine 0.1.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/amdefine for details
 */

/*jslint node: true */
/*global module, process */
'use strict';

/**
 * Creates a define for node.
 * @param {Object} module the "module" object that is defined by Node for the
 * current module.
 * @param {Function} [requireFn]. Node's require function for the current module.
 * It only needs to be passed in Node versions before 0.5, when module.require
 * did not exist.
 * @returns {Function} a define function that is usable for the current node
 * module.
 */
function amdefine(module, requireFn) {
    'use strict';
    var defineCache = {},
        loaderCache = {},
        alreadyCalled = false,
        path = require('path'),
        makeRequire, stringRequire;

    /**
     * Trims the . and .. from an array of path segments.
     * It will keep a leading path segment if a .. will become
     * the first path segment, to help with module name lookups,
     * which act like paths, but can be remapped. But the end result,
     * all paths that use this function should look normalized.
     * NOTE: this method MODIFIES the input array.
     * @param {Array} ary the array of path segments.
     */
    function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i+= 1) {
            part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            } else if (part === '..') {
                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                    //End of the line. Keep at least one non-dot
                    //path segment at the front so it can be mapped
                    //correctly to disk. Otherwise, there is likely
                    //no path mapping for a path starting with '..'.
                    //This can still fail, but catches the most reasonable
                    //uses of ..
                    break;
                } else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }

    function normalize(name, baseName) {
        var baseParts;

        //Adjust any relative paths.
        if (name && name.charAt(0) === '.') {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                baseParts = baseName.split('/');
                baseParts = baseParts.slice(0, baseParts.length - 1);
                baseParts = baseParts.concat(name.split('/'));
                trimDots(baseParts);
                name = baseParts.join('/');
            }
        }

        return name;
    }

    /**
     * Create the normalize() function passed to a loader plugin's
     * normalize method.
     */
    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(id) {
        function load(value) {
            loaderCache[id] = value;
        }

        load.fromText = function (id, text) {
            //This one is difficult because the text can/probably uses
            //define, and any relative paths and requires should be relative
            //to that id was it would be found on disk. But this would require
            //bootstrapping a module/require fairly deeply from node core.
            //Not sure how best to go about that yet.
            throw new Error('amdefine does not implement load.fromText');
        };

        return load;
    }

    makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
            if (typeof deps === 'string') {
                //Synchronous, single module require('')
                return stringRequire(systemRequire, exports, module, deps, relId);
            } else {
                //Array of dependencies with a callback.

                //Convert the dependencies to modules.
                deps = deps.map(function (depName) {
                    return stringRequire(systemRequire, exports, module, depName, relId);
                });

                //Wait for next tick to call back the require call.
                process.nextTick(function () {
                    callback.apply(null, deps);
                });
            }
        }

        amdRequire.toUrl = function (filePath) {
            if (filePath.indexOf('.') === 0) {
                return normalize(filePath, path.dirname(module.filename));
            } else {
                return filePath;
            }
        };

        return amdRequire;
    };

    //Favor explicit value, passed in if the module wants to support Node 0.4.
    requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
    };

    function runFactory(id, deps, factory) {
        var r, e, m, result;

        if (id) {
            e = loaderCache[id] = {};
            m = {
                id: id,
                uri: __filename,
                exports: e
            };
            r = makeRequire(requireFn, e, m, id);
        } else {
            //Only support one define call per file
            if (alreadyCalled) {
                throw new Error('amdefine with no module ID cannot be called more than once per file.');
            }
            alreadyCalled = true;

            //Use the real variables from node
            //Use module.exports for exports, since
            //the exports in here is amdefine exports.
            e = module.exports;
            m = module;
            r = makeRequire(requireFn, e, m, module.id);
        }

        //If there are dependencies, they are strings, so need
        //to convert them to dependency values.
        if (deps) {
            deps = deps.map(function (depName) {
                return r(depName);
            });
        }

        //Call the factory with the right dependencies.
        if (typeof factory === 'function') {
            result = factory.apply(m.exports, deps);
        } else {
            result = factory;
        }

        if (result !== undefined) {
            m.exports = result;
            if (id) {
                loaderCache[id] = m.exports;
            }
        }
    }

    stringRequire = function (systemRequire, exports, module, id, relId) {
        //Split the ID by a ! so that
        var index = id.indexOf('!'),
            originalId = id,
            prefix, plugin;

        if (index === -1) {
            id = normalize(id, relId);

            //Straight module lookup. If it is one of the special dependencies,
            //deal with it, otherwise, delegate to node.
            if (id === 'require') {
                return makeRequire(systemRequire, exports, module, relId);
            } else if (id === 'exports') {
                return exports;
            } else if (id === 'module') {
                return module;
            } else if (loaderCache.hasOwnProperty(id)) {
                return loaderCache[id];
            } else if (defineCache[id]) {
                runFactory.apply(null, defineCache[id]);
                return loaderCache[id];
            } else {
                if(systemRequire) {
                    return systemRequire(originalId);
                } else {
                    throw new Error('No module with ID: ' + id);
                }
            }
        } else {
            //There is a plugin in play.
            prefix = id.substring(0, index);
            id = id.substring(index + 1, id.length);

            plugin = stringRequire(systemRequire, exports, module, prefix, relId);

            if (plugin.normalize) {
                id = plugin.normalize(id, makeNormalize(relId));
            } else {
                //Normalize the ID normally.
                id = normalize(id, relId);
            }

            if (loaderCache[id]) {
                return loaderCache[id];
            } else {
                plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});

                return loaderCache[id];
            }
        }
    };

    //Create a define function specific to the module asking for amdefine.
    function define(id, deps, factory) {
        if (Array.isArray(id)) {
            factory = deps;
            deps = id;
            id = undefined;
        } else if (typeof id !== 'string') {
            factory = id;
            id = deps = undefined;
        }

        if (deps && !Array.isArray(deps)) {
            factory = deps;
            deps = undefined;
        }

        if (!deps) {
            deps = ['require', 'exports', 'module'];
        }

        //Set up properties for this module. If an ID, then use
        //internal cache. If no ID, then use the external variables
        //for this node module.
        if (id) {
            //Put the module in deep freeze until there is a
            //require call for it.
            defineCache[id] = [id, deps, factory];
        } else {
            runFactory(id, deps, factory);
        }
    }

    //define.require, which has access to all the values in the
    //cache. Useful for AMD modules that all have IDs in the file,
    //but need to finally export a value to node based on one of those
    //IDs.
    define.require = function (id) {
        if (loaderCache[id]) {
            return loaderCache[id];
        }

        if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
        }
    };

    define.amd = {};

    return define;
}

module.exports = amdefine;

}).call(this,require('_process'),"/node_modules\\deadunit\\node_modules\\deadunit-core\\node_modules\\source-map\\node_modules\\amdefine\\amdefine.js")
},{"_process":5,"path":4}],42:[function(require,module,exports){


module.exports = exceptionMode(createException()) // basically what browser this is

// verbatim from `mode` in stacktrace.js as of 2014-01-23
function exceptionMode(e) {
    if (e['arguments'] && e.stack) {
        return 'chrome';
    } else if (e.stack && e.sourceURL) {
        return 'safari';
    } else if (e.stack && e.number) {
        return 'ie';
    } else if (typeof e.message === 'string' && typeof window !== 'undefined' && window.opera) {
        // e.message.indexOf("Backtrace:") > -1 -> opera
        // !e.stacktrace -> opera
        if (!e.stacktrace) {
            return 'opera9'; // use e.message
        }
        // 'opera#sourceloc' in e -> opera9, opera10a
        if (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
            return 'opera9'; // use e.message
        }
        // e.stacktrace && !e.stack -> opera10a
        if (!e.stack) {
            return 'opera10a'; // use e.stacktrace
        }
        // e.stacktrace && e.stack -> opera10b
        if (e.stacktrace.indexOf("called from line") < 0) {
            return 'opera10b'; // use e.stacktrace, format differs from 'opera10a'
        }
        // e.stacktrace && e.stack -> opera11
        return 'opera11'; // use e.stacktrace, format differs from 'opera10a', 'opera10b'
    } else if (e.stack && !e.fileName) {
        // Chrome 27 does not have e.arguments as earlier versions,
        // but still does not have e.fileName as Firefox
        return 'chrome';
    } else if (e.stack) {
        return 'firefox';
    }
    return 'other';
}

function createException() {
    try {
        this.undef();
    } catch (e) {
        return e;
    }
}

},{}],43:[function(require,module,exports){
// Domain Public by Eric Wendelin http://eriwen.com/ (2008)
//                  Luke Smith http://lucassmith.name/ (2008)
//                  Loic Dachary <loic@dachary.org> (2008)
//                  Johan Euphrosine <proppy@aminche.com> (2008)
//                  Oyvind Sean Kinsey http://kinsey.no/blog (2010)
//                  Victor Homyakov <victor-homyakov@users.sourceforge.net> (2010)
(function(global, factory) {
  // Node
  if (typeof exports === 'object') {
    module.exports = factory();

  // AMD
  } else if (typeof define === 'function' && define.amd) {
    define(factory);

  // Browser globals
  } else {
    global.printStackTrace = factory();
  }
}(this, function() {
	/**
	 * Main function giving a function stack trace with a forced or passed in Error
	 *
	 * @cfg {Error} e The error to create a stacktrace from (optional)
	 * @cfg {Boolean} guess If we should try to resolve the names of anonymous functions
	 * @return {Array} of Strings with functions, lines, files, and arguments where possible
	 */
	function printStackTrace(options) {
	    options = options || {guess: true};
	    var ex = options.e || null, guess = !!options.guess;
	    var p = new printStackTrace.implementation(), result = p.run(ex);
	    return (guess) ? p.guessAnonymousFunctions(result) : result;
	}

	printStackTrace.implementation = function() {
	};

	printStackTrace.implementation.prototype = {
	    /**
	     * @param {Error} ex The error to create a stacktrace from (optional)
	     * @param {String} mode Forced mode (optional, mostly for unit tests)
	     */
	    run: function(ex, mode) {
	        ex = ex || this.createException();
	        // examine exception properties w/o debugger
	        //for (var prop in ex) {alert("Ex['" + prop + "']=" + ex[prop]);}
	        mode = mode || this.mode(ex);
	        if (mode === 'other') {
	            return this.other(arguments.callee);
	        } else {
	            return this[mode](ex);
	        }
	    },

	    createException: function() {
	        try {
	            this.undef();
	        } catch (e) {
	            return e;
	        }
	    },

	    /**
	     * Mode could differ for different exception, e.g.
	     * exceptions in Chrome may or may not have arguments or stack.
	     *
	     * @return {String} mode of operation for the exception
	     */
	    mode: function(e) {
	        if (e['arguments'] && e.stack) {
	            return 'chrome';
	        } else if (e.stack && e.sourceURL) {
	            return 'safari';
	        } else if (e.stack && e.number) {
	            return 'ie';
	        } else if (typeof e.message === 'string' && typeof window !== 'undefined' && window.opera) {
	            // e.message.indexOf("Backtrace:") > -1 -> opera
	            // !e.stacktrace -> opera
	            if (!e.stacktrace) {
	                return 'opera9'; // use e.message
	            }
	            // 'opera#sourceloc' in e -> opera9, opera10a
	            if (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
	                return 'opera9'; // use e.message
	            }
	            // e.stacktrace && !e.stack -> opera10a
	            if (!e.stack) {
	                return 'opera10a'; // use e.stacktrace
	            }
	            // e.stacktrace && e.stack -> opera10b
	            if (e.stacktrace.indexOf("called from line") < 0) {
	                return 'opera10b'; // use e.stacktrace, format differs from 'opera10a'
	            }
	            // e.stacktrace && e.stack -> opera11
	            return 'opera11'; // use e.stacktrace, format differs from 'opera10a', 'opera10b'
	        } else if (e.stack && !e.fileName) {
	            // Chrome 27 does not have e.arguments as earlier versions,
	            // but still does not have e.fileName as Firefox
	            return 'chrome';
	        } else if (e.stack) {
	            return 'firefox';
	        }
	        return 'other';
	    },

	    /**
	     * Given a context, function name, and callback function, overwrite it so that it calls
	     * printStackTrace() first with a callback and then runs the rest of the body.
	     *
	     * @param {Object} context of execution (e.g. window)
	     * @param {String} functionName to instrument
	     * @param {Function} callback function to call with a stack trace on invocation
	     */
	    instrumentFunction: function(context, functionName, callback) {
	        context = context || window;
	        var original = context[functionName];
	        context[functionName] = function instrumented() {
	            callback.call(this, printStackTrace().slice(4));
	            return context[functionName]._instrumented.apply(this, arguments);
	        };
	        context[functionName]._instrumented = original;
	    },

	    /**
	     * Given a context and function name of a function that has been
	     * instrumented, revert the function to it's original (non-instrumented)
	     * state.
	     *
	     * @param {Object} context of execution (e.g. window)
	     * @param {String} functionName to de-instrument
	     */
	    deinstrumentFunction: function(context, functionName) {
	        if (context[functionName].constructor === Function &&
	                context[functionName]._instrumented &&
	                context[functionName]._instrumented.constructor === Function) {
	            context[functionName] = context[functionName]._instrumented;
	        }
	    },

	    /**
	     * Given an Error object, return a formatted Array based on Chrome's stack string.
	     *
	     * @param e - Error object to inspect
	     * @return Array<String> of function calls, files and line numbers
	     */
	    chrome: function(e) {
	        var stack = (e.stack + '\n').replace(/^\S[^\(]+?[\n$]/gm, '').
	          replace(/^\s+(at eval )?at\s+/gm, '').
	          replace(/^([^\(]+?)([\n$])/gm, '{anonymous}()@$1$2').
	          replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}()@$1').split('\n');
	        stack.pop();
	        return stack;
	    },

	    /**
	     * Given an Error object, return a formatted Array based on Safari's stack string.
	     *
	     * @param e - Error object to inspect
	     * @return Array<String> of function calls, files and line numbers
	     */
	    safari: function(e) {
	        return e.stack.replace(/\[native code\]\n/m, '')
	            .replace(/^(?=\w+Error\:).*$\n/m, '')
	            .replace(/^@/gm, '{anonymous}()@')
	            .split('\n');
	    },

	    /**
	     * Given an Error object, return a formatted Array based on IE's stack string.
	     *
	     * @param e - Error object to inspect
	     * @return Array<String> of function calls, files and line numbers
	     */
	    ie: function(e) {
	        var lineRE = /^.*at (\w+) \(([^\)]+)\)$/gm;
	        return e.stack.replace(/at Anonymous function /gm, '{anonymous}()@')
	            .replace(/^(?=\w+Error\:).*$\n/m, '')
	            .replace(lineRE, '$1@$2')
	            .split('\n');
	    },

	    /**
	     * Given an Error object, return a formatted Array based on Firefox's stack string.
	     *
	     * @param e - Error object to inspect
	     * @return Array<String> of function calls, files and line numbers
	     */
	    firefox: function(e) {
	        return e.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^[\(@]/gm, '{anonymous}()@').split('\n');
	    },

	    opera11: function(e) {
	        var ANON = '{anonymous}', lineRE = /^.*line (\d+), column (\d+)(?: in (.+))? in (\S+):$/;
	        var lines = e.stacktrace.split('\n'), result = [];

	        for (var i = 0, len = lines.length; i < len; i += 2) {
	            var match = lineRE.exec(lines[i]);
	            if (match) {
	                var location = match[4] + ':' + match[1] + ':' + match[2];
	                var fnName = match[3] || "global code";
	                fnName = fnName.replace(/<anonymous function: (\S+)>/, "$1").replace(/<anonymous function>/, ANON);
	                result.push(fnName + '@' + location + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
	            }
	        }

	        return result;
	    },

	    opera10b: function(e) {
	        // "<anonymous function: run>([arguments not available])@file://localhost/G:/js/stacktrace.js:27\n" +
	        // "printStackTrace([arguments not available])@file://localhost/G:/js/stacktrace.js:18\n" +
	        // "@file://localhost/G:/js/test/functional/testcase1.html:15"
	        var lineRE = /^(.*)@(.+):(\d+)$/;
	        var lines = e.stacktrace.split('\n'), result = [];

	        for (var i = 0, len = lines.length; i < len; i++) {
	            var match = lineRE.exec(lines[i]);
	            if (match) {
	                var fnName = match[1]? (match[1] + '()') : "global code";
	                result.push(fnName + '@' + match[2] + ':' + match[3]);
	            }
	        }

	        return result;
	    },

	    /**
	     * Given an Error object, return a formatted Array based on Opera 10's stacktrace string.
	     *
	     * @param e - Error object to inspect
	     * @return Array<String> of function calls, files and line numbers
	     */
	    opera10a: function(e) {
	        // "  Line 27 of linked script file://localhost/G:/js/stacktrace.js\n"
	        // "  Line 11 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html: In function foo\n"
	        var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
	        var lines = e.stacktrace.split('\n'), result = [];

	        for (var i = 0, len = lines.length; i < len; i += 2) {
	            var match = lineRE.exec(lines[i]);
	            if (match) {
	                var fnName = match[3] || ANON;
	                result.push(fnName + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
	            }
	        }

	        return result;
	    },

	    // Opera 7.x-9.2x only!
	    opera9: function(e) {
	        // "  Line 43 of linked script file://localhost/G:/js/stacktrace.js\n"
	        // "  Line 7 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html\n"
	        var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
	        var lines = e.message.split('\n'), result = [];

	        for (var i = 2, len = lines.length; i < len; i += 2) {
	            var match = lineRE.exec(lines[i]);
	            if (match) {
	                result.push(ANON + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
	            }
	        }

	        return result;
	    },

	    // Safari 5-, IE 9-, and others
	    other: function(curr) {
	        var ANON = '{anonymous}', fnRE = /function\s*([\w\-$]+)?\s*\(/i, stack = [], fn, args, maxStackSize = 10;
	        while (curr && curr['arguments'] && stack.length < maxStackSize) {
	            fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
	            args = Array.prototype.slice.call(curr['arguments'] || []);
	            stack[stack.length] = fn + '(' + this.stringifyArguments(args) + ')';
	            curr = curr.caller;
	        }
	        return stack;
	    },

	    /**
	     * Given arguments array as a String, substituting type names for non-string types.
	     *
	     * @param {Arguments,Array} args
	     * @return {String} stringified arguments
	     */
	    stringifyArguments: function(args) {
	        var result = [];
	        var slice = Array.prototype.slice;
	        for (var i = 0; i < args.length; ++i) {
	            var arg = args[i];
	            if (arg === undefined) {
	                result[i] = 'undefined';
	            } else if (arg === null) {
	                result[i] = 'null';
	            } else if (arg.constructor) {
	                if (arg.constructor === Array) {
	                    if (arg.length < 3) {
	                        result[i] = '[' + this.stringifyArguments(arg) + ']';
	                    } else {
	                        result[i] = '[' + this.stringifyArguments(slice.call(arg, 0, 1)) + '...' + this.stringifyArguments(slice.call(arg, -1)) + ']';
	                    }
	                } else if (arg.constructor === Object) {
	                    result[i] = '#object';
	                } else if (arg.constructor === Function) {
	                    result[i] = '#function';
	                } else if (arg.constructor === String) {
	                    result[i] = '"' + arg + '"';
	                } else if (arg.constructor === Number) {
	                    result[i] = arg;
	                }
	            }
	        }
	        return result.join(',');
	    },

	    sourceCache: {},

	    /**
	     * @return the text from a given URL
	     */
	    ajax: function(url) {
	        var req = this.createXMLHTTPObject();
	        if (req) {
	            try {
	                req.open('GET', url, false);
	                //req.overrideMimeType('text/plain');
	                //req.overrideMimeType('text/javascript');
	                req.send(null);
	                //return req.status == 200 ? req.responseText : '';
	                return req.responseText;
	            } catch (e) {
	            }
	        }
	        return '';
	    },

	    /**
	     * Try XHR methods in order and store XHR factory.
	     *
	     * @return <Function> XHR function or equivalent
	     */
	    createXMLHTTPObject: function() {
	        var xmlhttp, XMLHttpFactories = [
	            function() {
	                return new XMLHttpRequest();
	            }, function() {
	                return new ActiveXObject('Msxml2.XMLHTTP');
	            }, function() {
	                return new ActiveXObject('Msxml3.XMLHTTP');
	            }, function() {
	                return new ActiveXObject('Microsoft.XMLHTTP');
	            }
	        ];
	        for (var i = 0; i < XMLHttpFactories.length; i++) {
	            try {
	                xmlhttp = XMLHttpFactories[i]();
	                // Use memoization to cache the factory
	                this.createXMLHTTPObject = XMLHttpFactories[i];
	                return xmlhttp;
	            } catch (e) {
	            }
	        }
	    },

	    /**
	     * Given a URL, check if it is in the same domain (so we can get the source
	     * via Ajax).
	     *
	     * @param url <String> source url
	     * @return <Boolean> False if we need a cross-domain request
	     */
	    isSameDomain: function(url) {
	        return typeof location !== "undefined" && url.indexOf(location.hostname) !== -1; // location may not be defined, e.g. when running from nodejs.
	    },

	    /**
	     * Get source code from given URL if in the same domain.
	     *
	     * @param url <String> JS source URL
	     * @return <Array> Array of source code lines
	     */
	    getSource: function(url) {
	        // TODO reuse source from script tags?
	        if (!(url in this.sourceCache)) {
	            this.sourceCache[url] = this.ajax(url).split('\n');
	        }
	        return this.sourceCache[url];
	    },

	    guessAnonymousFunctions: function(stack) {
	        for (var i = 0; i < stack.length; ++i) {
	            var reStack = /\{anonymous\}\(.*\)@(.*)/,
	                reRef = /^(.*?)(?::(\d+))(?::(\d+))?(?: -- .+)?$/,
	                frame = stack[i], ref = reStack.exec(frame);

	            if (ref) {
	                var m = reRef.exec(ref[1]);
	                if (m) { // If falsey, we did not get any file/line information
	                    var file = m[1], lineno = m[2], charno = m[3] || 0;
	                    if (file && this.isSameDomain(file) && lineno) {
	                        var functionName = this.guessAnonymousFunction(file, lineno, charno);
	                        stack[i] = frame.replace('{anonymous}', functionName);
	                    }
	                }
	            }
	        }
	        return stack;
	    },

	    guessAnonymousFunction: function(url, lineNo, charNo) {
	        var ret;
	        try {
	            ret = this.findFunctionName(this.getSource(url), lineNo);
	        } catch (e) {
	            ret = 'getSource failed with url: ' + url + ', exception: ' + e.toString();
	        }
	        return ret;
	    },

	    findFunctionName: function(source, lineNo) {
	        // FIXME findFunctionName fails for compressed source
	        // (more than one function on the same line)
	        // function {name}({args}) m[1]=name m[2]=args
	        var reFunctionDeclaration = /function\s+([^(]*?)\s*\(([^)]*)\)/;
	        // {name} = function ({args}) TODO args capture
	        // /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function(?:[^(]*)/
	        var reFunctionExpression = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*function\b/;
	        // {name} = eval()
	        var reFunctionEvaluation = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*(?:eval|new Function)\b/;
	        // Walk backwards in the source lines until we find
	        // the line which matches one of the patterns above
	        var code = "", line, maxLines = Math.min(lineNo, 20), m, commentPos;
	        for (var i = 0; i < maxLines; ++i) {
	            // lineNo is 1-based, source[] is 0-based
	            line = source[lineNo - i - 1];
	            commentPos = line.indexOf('//');
	            if (commentPos >= 0) {
	                line = line.substr(0, commentPos);
	            }
	            // TODO check other types of comments? Commented code may lead to false positive
	            if (line) {
	                code = line + code;
	                m = reFunctionExpression.exec(code);
	                if (m && m[1]) {
	                    return m[1];
	                }
	                m = reFunctionDeclaration.exec(code);
	                if (m && m[1]) {
	                    //return m[1] + "(" + (m[2] || "") + ")";
	                    return m[1];
	                }
	                m = reFunctionEvaluation.exec(code);
	                if (m && m[1]) {
	                    return m[1];
	                }
	            }
	        }
	        return '(?)';
	    }
	};

	return printStackTrace;
}));
},{}],44:[function(require,module,exports){
var printStackTrace = require('stacktrace-js')
var parsers = require('./tracelineParser')
var mode = require('./exceptionMode')

module.exports = function(ex) {
    if(parsers[mode] === undefined)
        throw new Error("browser "+mode+" not supported")

    var options = undefined
    if(ex !== undefined) {
        if(mode === 'ie' && ex.number === undefined)
            ex.number = 1    // work around for this: https://github.com/stacktracejs/stacktrace.js/issues/80
        options = {e:ex, guess: true}
    }
    var trace = printStackTrace(options)

    if(ex === undefined) {
        trace.splice(0,4) // strip stacktrace-js internals
    }

    return parseStacktrace(trace)
}

function TraceInfo(traceline) {
    this.traceline = traceline
}
TraceInfo.prototype = {
    get file() {
        return getInfo(this).file
    },
    get function() {
        return getInfo(this).function
    },
    get line() {
        return getInfo(this).line
    },
    get column() {
        return getInfo(this).column
    },
    get info() {
        return getInfo(this)
    }
}

function getInfo(traceInfo) {
    if(traceInfo.cache === undefined) {
        var info = parsers[mode](traceInfo.traceline)
        if(info.line !== undefined)
            info.line = parseInt(info.line)
        if(info.column !== undefined)
            info.column = parseInt(info.column)

        traceInfo.cache = info
    }

    return traceInfo.cache
}

function parseStacktrace(trace) {
    var results = []
    for(var n = 0; n<trace.length; n++) {
        results.push(new TraceInfo(trace[n]))
    }
    return results
}

// here because i'm lazy, they're here for testing only
module.exports.parsers = parsers
module.exports.mode = mode
module.exports.sourceCache = printStackTrace.implementation.prototype.sourceCache // expose this so you can consolidate caches together from different libraries

},{"./exceptionMode":42,"./tracelineParser":45,"stacktrace-js":43}],45:[function(require,module,exports){

module.exports = {
    chrome: function(line) {
        var m = line.match(CHROME_STACK_LINE);
        if (m) {
            var file = m[9] || m[18] || m[26]
            var fn = m[4] || m[7] || m[14] || m[23]
            var lineNumber = m[11] || m[20]
            var column = m[13] || m[22]
        } else {
            //throw new Error("Couldn't parse exception line: "+line)
        }
        
        return {
            file: file,
            function: fn,
            line: lineNumber,
            column: column
        }
    },
    
    firefox: function(line) {
        var m = line.match(FIREFOX_STACK_LINE);
        if (m) {
            var file = m[8]
            var fn = m[1]
            var lineNumber = m[10]
            var column = m[12]
        }
        
        return {
            file: file,
            function: fn,
            line: lineNumber,
            column: column
        }
    },
    
    ie: function(line) {
        var m = line.match(IE_STACK_LINE);
        if (m) {
            var file = m[3] || m[10]
            var fn = m[2] || m[9]
            var lineNumber = m[5] || m[12]
            var column = m[7] || m[14]
        }
        
        return {
            file: file,
            function: fn,
            line: lineNumber,
            column: column
        }
    }
}

// The following 2 regex patterns were originally taken from google closure library: https://code.google.com/p/closure-library/source/browse/closure/goog/testing/stacktrace.js
// RegExp pattern for JavaScript identifiers. We don't support Unicode identifiers defined in ECMAScript v3.
var IDENTIFIER_PATTERN_ = '[a-zA-Z_$][\\w$]*';
// RegExp pattern for an URL + position inside the file.
var URL_PATTERN_ = '((?:http|https|file)://[^\\s)]+?|javascript:.*)';
var FILE_AND_LINE = URL_PATTERN_+'(:(\\d*)(:(\\d*))?)'

var STACKTRACE_JS_GETSOURCE_FAILURE = 'getSource failed with url'

var CHROME_STACKTRACE_JS_GETSOURCE_FAILURE = STACKTRACE_JS_GETSOURCE_FAILURE+'((?!'+'\\(\\)@'+').)*'

var CHROME_FILE_AND_LINE = FILE_AND_LINE//URL_PATTERN_+'(:(\\d*):(\\d*))'
var CHROME_IDENTIFIER_PATTERN = '\\<?'+IDENTIFIER_PATTERN_+'\\>?'
var CHROME_COMPOUND_IDENTIFIER = "((new )?"+CHROME_IDENTIFIER_PATTERN+'(\\.'+CHROME_IDENTIFIER_PATTERN+')*)( \\[as '+IDENTIFIER_PATTERN_+'])?'
var CHROME_UNKNOWN_IDENTIFIER = "(\\(\\?\\))"

// output from stacktrace.js is: "name()@..." instead of "name (...)"
var CHROME_ANONYMOUS_FUNCTION = '('+CHROME_STACKTRACE_JS_GETSOURCE_FAILURE+'|'+CHROME_COMPOUND_IDENTIFIER+'|'+CHROME_UNKNOWN_IDENTIFIER+')'
                                    +'\\(\\)'+'@'+CHROME_FILE_AND_LINE
var CHROME_NORMAL_FUNCTION = CHROME_COMPOUND_IDENTIFIER+' \\('+CHROME_FILE_AND_LINE+'\\)'
var CHROME_NATIVE_FUNCTION = CHROME_COMPOUND_IDENTIFIER+' (\\(native\\))'

var CHROME_FUNCTION_CALL = '('+CHROME_ANONYMOUS_FUNCTION+"|"+CHROME_NORMAL_FUNCTION+"|"+CHROME_NATIVE_FUNCTION+')'

var CHROME_STACK_LINE = new RegExp('^'+CHROME_FUNCTION_CALL+'$')  // precompile them so its faster


var FIREFOX_STACKTRACE_JS_GETSOURCE_FAILURE = STACKTRACE_JS_GETSOURCE_FAILURE+'((?!'+'\\(\\)@'+').)*'+'\\(\\)'
var FIREFOX_FILE_AND_LINE = FILE_AND_LINE//URL_PATTERN_+'((:(\\d*):(\\d*))|(:(\\d*)))'
var FIREFOX_ARRAY_PART = '\\[\\d*\\]'
var FIREFOX_WEIRD_PART = '\\(\\?\\)'
var FIREFOX_COMPOUND_IDENTIFIER = '(('+IDENTIFIER_PATTERN_+'|'+FIREFOX_ARRAY_PART+'|'+FIREFOX_WEIRD_PART+')((\\(\\))?|(\\.|\\<|/)*))*'
var FIREFOX_FUNCTION_CALL = '('+FIREFOX_COMPOUND_IDENTIFIER+'|'+FIREFOX_STACKTRACE_JS_GETSOURCE_FAILURE+')@'+FIREFOX_FILE_AND_LINE
var FIREFOX_STACK_LINE = new RegExp('^'+FIREFOX_FUNCTION_CALL+'$')

var IE_WHITESPACE = '[\\w \\t]'
var IE_FILE_AND_LINE = FILE_AND_LINE
var IE_ANONYMOUS = '('+IE_WHITESPACE+'*({anonymous}\\(\\)))@\\('+IE_FILE_AND_LINE+'\\)'
var IE_NORMAL_FUNCTION = '('+IDENTIFIER_PATTERN_+')@'+IE_FILE_AND_LINE
var IE_FUNCTION_CALL = '('+IE_NORMAL_FUNCTION+'|'+IE_ANONYMOUS+')'+IE_WHITESPACE+'*'
var IE_STACK_LINE = new RegExp('^'+IE_FUNCTION_CALL+'$')
},{}],46:[function(require,module,exports){
module.exports = function returnResults(unitTestObject) {

    var results;
    var groups = {}
    var groupMetadata = {}

    var primaryGroup;
    var ended = false

    unitTestObject.events({
        group: function(e) {
            var g = {
               parent: e.parent,
               id: e.id,              // a unique id for the test group
               type: 'group',         // indicates a test group (either a `Unit.test` call or `this.test`)
               name: e.name,          // the name of the test
               results: [],           // An array of test results, which can be of an `UnitTest` Result Types
               exceptions: [],        // An array of uncaught exceptions thrown in the test,
               time: e.time,
               duration: 0            // the duration of the test from its start til the last test action (assert, log, etc)
               //                       including asynchronous parts and including subtests
               //syncDuration: _,      // the synchronous duration of the test (not including any asynchronous parts)
               //totalSyncDuration: _  // syncDuration plus the before and after (if applicable)
            }

            if(primaryGroup === undefined) primaryGroup = g

            groups[e.id] = g
            groupMetadata[e.id] = {}
            if(e.parent === undefined) {
                results = g
            } else {
                groups[e.parent].results.push(g)
            }
        },
        assert: function(e) {
            e.type = 'assert'
            groups[e.parent].results.push(e)
            setGroupDuration(e.parent, e.time)
        },
        count: function(e) {
            e.type = 'assert'
            setGroupDuration(e.parent, e.time)

            groupMetadata[e.parent].countInfo = e
        },
        exception: function(e) {
            groups[e.parent].exceptions.push(e.error)
            setGroupDuration(e.parent, e.time)
        },
        log: function(e) {
            e.type = 'log'
            groups[e.parent].results.push(e)
            setGroupDuration(e.parent, e.time)
        },
        before: function(e) {
            groups[e.parent].beforeStart = e.time
        },
        after: function(e) {
            groups[e.parent].afterStart = e.time
        },
        beforeEnd: function(e) {
            groups[e.parent].beforeDuration = e.time - groups[e.parent].beforeStart
        },
        afterEnd: function(e) {
            groups[e.parent].afterDuration = e.time - groups[e.parent].afterStart
        },
        groupEnd: function(e) {
            setGroupDuration(e.id, e.time)
        },
        end: function(e) {
            primaryGroup.timeout = e.type === 'timeout'
            setGroupDuration(primaryGroup.id, e.time)

            // make the count assertions
            eachTest(primaryGroup, function(subtest, parenttest) {
                var countInfo = groupMetadata[subtest.id].countInfo
                if(countInfo !== undefined) {
                    var info = countInfo
                    var actualCount = 0
                    subtest.results.forEach(function(a) {
                        if(a.type === 'assert' || a.type === 'group')
                            actualCount++
                    })

                    subtest.results.splice(0,0,{
                        parent: subtest.id,
                        type: 'assert',
                        success: actualCount === info.expected,
                        time: info.time,
                        sourceLines: info.sourceLines,
                        file: info.file,
                        line: info.line,
                        column: info.column,
                        expected: info.expected,
                        actual: actualCount
                    })
                }
            })

            ended = true
        }
    })

    function setGroupDuration(groupid, time) {
        var newDuration = time - groups[groupid].time
        if(newDuration > groups[groupid].duration) {
            groups[groupid].duration = newDuration
        }

        if(groups[groupid].parent) {
            setGroupDuration(groups[groupid].parent, time)
        }
    }

    return results
}


// iterates through the tests and subtests leaves first (depth first)
function eachTest(test, callback, parent) {
    test.results.forEach(function(result) {
        if(result.type === 'group') {
            eachTest(result, callback, test)
        }
    })

    callback(test, parent)
}
},{}],47:[function(require,module,exports){
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
        try {
            ProtoObjectFactory[n] = prototype[n]
        } catch(e) {
            // do nothing, if a property (like `name`) can't be set, just ignore it
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

        this.stack = tmp.stack
        this.message = tmp.message

        return this
    }
        var IntermediateInheritor = function() {}
            IntermediateInheritor.prototype = ErrorObject.prototype
        NormalizedError.prototype = new IntermediateInheritor()
    return NormalizedError
}
},{}],48:[function(require,module,exports){
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
},{}],49:[function(require,module,exports){
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
},{"./utils":52,"events":2,"proto":48}],50:[function(require,module,exports){
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

},{"../observe":49,"./testUtils":51}],51:[function(require,module,exports){

// compares arrays and objects for value equality (all elements and members must match)
exports.equal = function(a,b) {
    if(a instanceof Array) {
        if(!(b instanceof Array))
            return false
        if(a.length !== b.length) {
            return false
        } else {
            for(var n=0; n<a.length; n++) {
                if(!exports.equal(a[n],b[n])) {
                    return false
                }
            }
            // else
            return true
        }
    } else if(a instanceof Object) {
        if(!(b instanceof Object))
            return false

        var aKeys = getKeys(a)
        var bKeys = getKeys(b)

        if(aKeys.length !== bKeys.length) {
            return false
        } else {
            for(var n=0; n<aKeys.length; n++) {
                var key = aKeys[n]
                var aVal = a[key]
                var bVal = b[key]

                if(!exports.equal(aVal,bVal)) {
                    return false
                }
            }
            // else
            return true
        }
    } else {
        return a===b || Number.isNaN(a) && Number.isNaN(b)
    }
}

// counts object keys ignoring properties that are undefined
function getKeys(x) {
    var keys=[]
    for(var k in x) {
        if(x[k] !== undefined) {
            keys.push(k)
        }
    }

    return keys
}

// returns a function that should be passed a bunch of functions as its arguments
// each time that function is called, the next function in the list will be called
// example:
/*  var sequenceX = testUtils.sequence()
 var obj = {a:1,b:2,c:3}

 for(var x in obj) {
     sequenceX(function() {
         t.ok(x === 'a')
     },
     function() {
         t.ok(x === 'b')
     },
     function() {
         t.ok(x === 'c')
     })
 }
 */
exports.sequence = function() {
    var n=-1
    return function() {
        var fns = arguments
        n++
        if(n>=fns.length)
            throw new Error("Unexpected call: "+n)
        // else
        fns[n]()
    }
}




},{}],52:[function(require,module,exports){
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

},{"path":4}]},{},[1])(1)
});