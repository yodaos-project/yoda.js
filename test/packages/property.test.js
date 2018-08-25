'use strict'

var test = require('tape')
var prop = require('property')

test('simple property', function (t) {
  t.plan(1)
  prop.set('test_key', 'foobar')
  t.equal(prop.get('test_key'), 'foobar')
  t.end()
})

test('basic info', function (t) {
  t.equal(typeof prop.get('ro.build.version.release'), 'string')
  t.equal(typeof prop.get('ro.rokid.build.platform'), 'string')
  t.end()
})
