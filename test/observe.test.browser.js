"use strict";

var Unit = require('deadunit/deadunit.browser')
var tests = require('./observe.tests')

Unit.test("Testing observe", tests).writeHtml()

