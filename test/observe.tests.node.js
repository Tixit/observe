"use strict";

var Unit = require('deadunit')
var tests = require('./observe.tests')

Unit.test("Testing observe", tests).writeConsole(1000)


