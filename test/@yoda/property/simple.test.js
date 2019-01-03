'use strict'

var test = require('tape')
var prop = require('@yoda/property')
var fs = require('fs')

test('module->property->set method: key starting with persist.', t => {
  t.plan(2)
  prop.set('persist.test.a', 'test.a')
  t.equal(prop.get('persist.test.a'), 'test.a')
  var text = fs.readFileSync('/data/property/persist.test.a', 'utf8')
  t.equal(text, 'test.a')
  t.end()
})

test('module->property->set method: key starting with persist-', t => {
  t.plan(2)
  prop.set('persist-test.a', 'test.a')
  t.equal(prop.get('persist-test.a'), 'test.a')
  t.throws(() => {
    fs.readFileSync('/data/property/persist-test.a', 'utf8')
  }, new RegExp('no such file or directory'), 'should be no files')
  t.end()
})

test('module->property->set method: key starting with ro.', t => {
  t.plan(2)
  prop.set('ro.test.a', 'test.a')
  t.equal(prop.get('ro.test.a'), 'test.a')
  prop.set('ro.test.a', 'test.b')
  t.equal(prop.get('ro.test.a'), 'test.a')
  t.end()
})

/**
 * the key starts with ro.*, these key and values are readonly.
 */
test('module->property->set method: readonly key', t => {
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

test('module->property->set method: normal key', t => {
  t.plan(1)
  prop.set('test_key', 'foobar')
  t.equal(prop.get('test_key'), 'foobar')
  t.end()
})

test('module->property->set method: normal key, set method typeof number', t => {
  t.plan(1)
  prop.set('number_key', 2)
  t.equal(typeof prop.get('number_key'), 'string')
  t.end()
})

test('module->property->set method: normal key, set key typeof number', t => {
  t.plan(2)
  t.throws(() => {
    prop.set(3, '4')
  }, /key must be a string/, 'key must be a string')
  t.equal(prop.get('3'), '')
  t.end()
})

test('module->property->set method: set long key ', t => {
  var key = 'test_key.aaa.bbb.ccc.ddd.fff.ggg.ppp.www.rrr.eee.vvv.bbb.nnn.mmm'
  t.throws(() => {
    prop.set(key, 'test')
  }, /key is too long/, 'key is too long')
  t.equal(prop.get(key), '')
  t.end()
})

test('invalid key assertions', t => {
  t.throws(() => prop.get('', 'foobar'), /key must not be empty string/)
  t.throws(() => prop.set('@', 'foobar'), /invalid key, it must be string with dot/)
  t.throws(() => prop.set('test', null), TypeError)
  t.end()
})

test.skip('module->property->set method: set long value', t => {
  var key = 'test_key.long.vaule'
  var value = 'aaaa.bbbb.cccc.dddd.eeee.ffff.mmmm.qqqq.wwww.eeee.rrrr.tttt.uuuu.tttt.yyyy.uuuu.iiii.oooo.pppp'
  prop.set(key, value)
  t.equal(prop.get(key), value)
  t.end()
})

/**
 * bug id = 1292
 */
test.skip('module->property->set method: set key with special symbol', t => {
  t.plan(1)
  t.throws(() => {
    prop.set('test_key.&', 'test')
  }, TypeError)
  t.end()
})

test('module->property->get method', function (t) {
  t.plan(3)
  t.equal(typeof prop.get('ro.build.version.release'), 'string')
  t.equal(typeof prop.get('ro.rokid.build.platform'), 'string')
  t.equal(typeof prop.get('xxx'), 'string')
  t.end()
})

test('module->property->get method: key is null', function (t) {
  t.plan(1)
  t.throws(() => {
    prop.get(null)
  }, new RegExp('key must be a string'), 'key must be a string')
  t.end()
})

test('module->property->set method: key is null', function (t) {
  t.plan(1)
  t.throws(() => {
    prop.set(null)
  }, new RegExp('key must be a string'), 'key must be a string')
  t.end()
})

/**
 * bug id = 1303
 */
test.skip('module->property->set method: value must be needed', function (t) {
  t.plan(1)
  t.throws(() => {
    prop.set('test_key.xxxxx')
  }, /value must be required to be not undefined or null/)
  t.end()
})
