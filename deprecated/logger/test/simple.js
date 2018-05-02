'use strict';

var assert = require('assert');
var logger = require('../index.js')('test');

assert.equal(typeof logger.log, 'function');
assert.equal(typeof logger.info, 'function');
assert.equal(typeof logger.warn, 'function');
assert.equal(typeof logger.error, 'function');
console.log('test is ok');