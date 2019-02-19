'use strict'

var test = require('tape')
var sys = require('@yoda/system')
var logger = require('logger')('system-test')

test('module->system: verifyOtaImage', t => {
  // TODO: function not implemented
  t.plan(2)
  var result = sys.verifyOtaImage()
  t.equal(typeof result, 'boolean')
  t.ok(result)
  t.end()
})

/**
 * bug id = 1304
 */
test.skip('module->diskusage: path must be needed', t => {
  t.plan(1)
  t.throws(() => {
    sys.diskUsage()
  }, new RegExp('Expect a string on first argument of diskUsage'), 'expect a string on first argument')
  t.end()
})

test('module->diskusage: path is emtpy string', t => {
  t.plan(1)
  t.throws(() => {
    sys.diskUsage('')
  }, new RegExp('No such file or directory'), 'no such directory')
  t.end()
})

test.skip('module->diskusage: path is null ', t => {
  t.plan(1)
  t.throws(() => {
    sys.diskUsage(null)
  }, new RegExp('Expect a string on first argument of diskUsage'), 'expect a string on first argument')
  t.end()
})

test('module->diskusage: invalid path , eg. /aaa/dddd', t => {
  t.plan(1)
  t.throws(() => {
    sys.diskUsage('/aaa/dddd')
  }, new RegExp('No such file or directory'), 'no such directory')
  t.end()
})

test('module->diskusage: /', t => {
  t.plan(4)
  var diskusage = sys.diskUsage('/')
  logger.info(diskusage)
  t.equal(typeof diskusage.available, 'number')
  t.equal(typeof diskusage.free, 'number')
  t.equal(typeof diskusage.total, 'number')
  t.ok(diskusage.total > diskusage.free)
  t.end()
})

test('module->diskusage: /data', t => {
  t.plan(10)
  var diskusage = sys.diskUsage('/data')
  t.equal(typeof diskusage.available, 'number')
  t.equal(typeof diskusage.free, 'number')
  t.equal(typeof diskusage.total, 'number')
  t.ok(diskusage.total > diskusage.free)
  var pdiskusage = sys.diskUsage('/data/property')
  t.equal(typeof pdiskusage.available, 'number')
  t.equal(typeof pdiskusage.free, 'number')
  t.equal(typeof pdiskusage.total, 'number')
  t.equal(diskusage.available, pdiskusage.available)
  t.equal(diskusage.free, pdiskusage.free)
  t.equal(diskusage.total, pdiskusage.total)
  t.end()
})

test('module->diskusage: /tmp', t => {
  t.plan(4)
  var diskusage = sys.diskUsage('/tmp')
  logger.info(diskusage)
  t.equal(typeof diskusage.available, 'number')
  t.equal(typeof diskusage.free, 'number')
  t.equal(typeof diskusage.total, 'number')
  t.ok(diskusage.total > diskusage.free)
  t.end()
})

test('module->diskusage: support file path, eg. /bin/debug.sh', t => {
  t.plan(10)
  var diskusage = sys.diskUsage('/bin')
  t.equal(typeof diskusage.available, 'number')
  t.equal(typeof diskusage.free, 'number')
  t.equal(typeof diskusage.total, 'number')
  t.ok(diskusage.total > diskusage.free)
  var fdiskusage = sys.diskUsage('/bin/debug.sh')
  t.equal(typeof fdiskusage.available, 'number')
  t.equal(typeof fdiskusage.free, 'number')
  t.equal(typeof fdiskusage.total, 'number')
  t.equal(diskusage.available, fdiskusage.available)
  t.equal(diskusage.free, fdiskusage.free)
  t.equal(diskusage.total, fdiskusage.total)
  t.end()
})

test.skip('module->system: reboot', t => {
  t.plan(2)
  var result = sys.reboot('test')
  t.equal(typeof result, 'boolean')
  t.ok(result)
  t.end()
})
