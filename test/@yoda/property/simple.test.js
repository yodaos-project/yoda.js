'use strict'

var test = require('tape')
var prop = require('@yoda/property')

/**
 * the key starts with ro.*, these key and values are readonly.
 */
test('module->property->set value : readonly key', t => {
  t.plan(4)
  var usid = prop.get('ro.boot.usid')
  var device = prop.get('ro.rokid.device')
  var locale = prop.get('ro.product.locale')
  var version = prop.get('ro.build.version.release')
  prop.set('ro.rokid.device', 'device-xxxxx')
  prop.set('ro.boot.usid', 'usid-xxxxx')
  prop.set('ro.product.locale', 'en-xxxxx')
  prop.set('ro.build.version.release', 'version-xxxxx')
  t.equal(prop.get('ro.boot.usid'), usid)
  t.equal(prop.get('ro.rokid.device'), device)
  t.equal(prop.get('ro.product.locale'), locale)
  t.equal(prop.get('ro.build.version.release'), version)
  t.end()
})

test('module->property->set value : normal key', t => {
  t.plan(1)
  prop.set('test_key', 'foobar')
  t.equal(prop.get('test_key'), 'foobar')
  t.end()
})

test('module->property->set value : normal key, set value typeof number', t => {
  t.plan(1)
  prop.set('number_key', 2)
  t.equal(typeof prop.get('number_key'), 'string')
  t.end()
})

test('module->property->set value : normal key, set key typeof number', t => {
  t.plan(2)
  t.throws(() => { prop.set(3, 4) }, new RegExp('key must be a string'), 'key must be a string')
  t.equal(prop.get('3'), '')
  t.end()
})

/**
 * bug id = 1291
 */
test.skip('module->property->set value : normal key, set long key ', t => {
  t.plan(1)
  var key = 'test_key.aaa.bbb.ccc.ddd.fff.ggg.ppp.www.rrr.eee.vvv.bbb.nnn.mmm'
  prop.set(key, 'test')
  t.equal(prop.get(key), 'test')
  t.end()
})

/**
 * bug id = 1292
 */
test.skip('module->property->set value : normal key, set key ', t => {
  t.plan(1)
  var key = 'test_key.&'
  prop.set(key, 'test')
  t.equal(prop.get(key), 'test')
  t.end()
})

test('basic info', function (t) {
  t.equal(typeof prop.get('ro.build.version.release'), 'string')
  t.equal(typeof prop.get('ro.rokid.build.platform'), 'string')
  t.end()
})
