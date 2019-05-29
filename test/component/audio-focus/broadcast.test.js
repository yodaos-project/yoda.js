var test = require('tape')
var bootstrap = require('../../bootstrap')
var mm = require('../../helper/mock')

test('should broadcast on focus shifts', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var broadcast = tt.component.broadcast
  var desc = tt.descriptor.audioFocus
  mm.mockReturns(desc, 'emitToApp', function () {})

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.strictEqual(channel, 'yodaos.audio-focus.on-focus-shift')
    t.deepEqual(params, [
      { id: 1, appId: 'test', exclusive: false, mayDuck: false, transient: false },
      null
    ])
  })

  comp.request({
    id: 1,
    appId: 'test'
  })

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.strictEqual(channel, 'yodaos.audio-focus.on-focus-shift')
    t.deepEqual(params, [
      { id: 2, appId: 'test', exclusive: false, mayDuck: false, transient: false },
      { id: 1, appId: 'test', exclusive: false, mayDuck: false, transient: false }
    ])
  })
  comp.request({
    id: 2,
    appId: 'test'
  })

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.strictEqual(channel, 'yodaos.audio-focus.on-focus-shift')
    t.deepEqual(params, [
      { id: 3, appId: 'test', exclusive: false, mayDuck: false, transient: true },
      { id: 2, appId: 'test', exclusive: false, mayDuck: false, transient: false }
    ])
  })
  comp.request({
    id: 3,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  t.end()
})

test('should broadcast on abandoning focuses proactively', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var broadcast = tt.component.broadcast
  var desc = tt.descriptor.audioFocus
  mm.mockReturns(desc, 'emitToApp', function () {})

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.fail('should not broadcast if there is no focus shifting')
  })
  comp.abandon('test', 1)

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {})
  comp.request({
    id: 1,
    appId: 'test'
  })

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.strictEqual(channel, 'yodaos.audio-focus.on-focus-shift')
    t.deepEqual(params, [
      null,
      { id: 1, appId: 'test', exclusive: false, mayDuck: false, transient: false }
    ])
  })
  comp.abandon('test', 1)

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {})
  comp.request({
    id: 2,
    appId: 'test'
  })
  comp.request({
    id: 3,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.deepEqual(params, [
      { id: 2, appId: 'test', exclusive: false, mayDuck: false, transient: false },
      { id: 3, appId: 'test', exclusive: false, mayDuck: false, transient: true }
    ])
  })
  comp.abandon('test', 3)

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {})
  comp.request({
    id: 4,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.fail('unreachable path')
  })
  comp.abandon('test', 2)
  t.end()
})

test('should broadcast on abandoning all focuses proactively', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var broadcast = tt.component.broadcast
  var desc = tt.descriptor.audioFocus
  mm.mockReturns(desc, 'emitToApp', function () {})

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.fail('should not broadcast if no focus shifting')
  })
  comp.abandonAllFocuses()

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {})
  comp.request({
    id: 1,
    appId: 'test'
  })
  comp.request({
    id: 2,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.deepEqual(params, [
      null,
      { id: 2, appId: 'test', exclusive: false, mayDuck: false, transient: true }
    ])
  })
  comp.abandonAllFocuses()

  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {})
  comp.request({
    id: 4,
    appId: 'test'
  })
  mm.mockReturns(broadcast, 'dispatch', function (channel, params) {
    t.deepEqual(params, [
      null,
      { id: 4, appId: 'test', exclusive: false, mayDuck: false, transient: false }
    ])
  })
  comp.abandonAllFocuses()
  t.end()
})
