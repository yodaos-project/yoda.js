'use strict'

var test = require('tape')
var helper = require('../helper')
var perf = require(`${helper.paths.runtime}/lib/performance`)

test('should test perf.stub', t => {
  perf.stub('test')
  t.end()
})
