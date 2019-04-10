'use strict'

var test = require('tape')

var mm = require('../../helper/mock')
var bootstrap = require('../bootstrap')

test('descriptor should register request', t => {
  t.plan(2)

  var tt = bootstrap()
  mm.mockPromise(tt.runtime, 'ttsMethod', () => {
    return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
  })

  var bridge = tt.getBridge({ appId: 'test' })
  bridge.invoke('tts', 'speak', [ 'foobar', { impatient: true } ])
    .then(ttsId => {
      t.strictEqual(ttsId, '1')
      t.notLooseEqual(tt.runtime.descriptor.tts.requests['1'], null)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('descriptor should clear request on spoken', t => {
  t.plan(1)

  var tt = bootstrap()
  mm.mockPromise(tt.runtime, 'ttsMethod', () => {
    setTimeout(() => {
      tt.runtime.descriptor.tts.handleEvent('start', '1', 'test')
      tt.runtime.descriptor.tts.handleEvent('end', '1', 'test')
    }, 1000)
    return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
  })

  var bridge = tt.getBridge({ appId: 'test' })
  bridge.invoke('tts', 'speak', [ 'foobar' ])
    .then(() => {
      t.looseEqual(tt.runtime.descriptor.tts.requests['1'], null)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('descriptor should clear request on error', t => {
  t.plan(2)

  var tt = bootstrap()
  mm.mockPromise(tt.runtime, 'ttsMethod', () => {
    setTimeout(() => {
      tt.runtime.descriptor.tts.handleEvent('start', '1', 'test')
      tt.runtime.descriptor.tts.handleEvent('error', '1', 'test', 123)
    }, 1000)
    return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
  })

  var bridge = tt.getBridge({ appId: 'test' })
  bridge.invoke('tts', 'speak', [ 'foobar' ])
    .then(() => {
      t.fail('unreachable path')
      t.end()
    })
    .catch(err => {
      t.strictEqual(err.code, 123)
      t.looseEqual(tt.runtime.descriptor.tts.requests['1'], null)
      t.end()
    })
})
