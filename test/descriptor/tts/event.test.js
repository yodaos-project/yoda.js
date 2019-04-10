'use strict'

var test = require('tape')
var _ = require('@yoda/util')._

var mm = require('../../helper/mock')
var bootstrap = require('../bootstrap')

test('descriptor should transfer normal events', t => {
  t.plan(2)

  var tt = bootstrap()
  mm.mockPromise(tt.runtime, 'ttsMethod', () => {
    setTimeout(() => {
      tt.runtime.descriptor.tts.handleEvent('start', '1', 'test')
      tt.runtime.descriptor.tts.handleEvent('end', '1', 'test')
    }, 1000)
    return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
  })

  var bridge = tt.getBridge({ appId: 'test' })
  ;['start', 'end'].forEach(it => {
    bridge.subscribe('tts', it, (ttsId) => {
      t.strictEqual(ttsId, '1')
    })
  })

  bridge.invoke('tts', 'speak', [ 'foobar' ])
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('descriptor should not transfer error events for patient clients', t => {
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
  ;['start'].forEach(it => {
    bridge.subscribe('tts', it, (ttsId) => {
      t.strictEqual(ttsId, '1')
    })
  })
  ;['error'].forEach(it => {
    bridge.subscribe('tts', it, () => {
      t.fail('unexpected error event')
    })
  })

  bridge.invoke('tts', 'speak', [ 'foobar' ])
    .then(() => {
      t.fail('unreachable path')
      t.end()
    })
    .catch(err => {
      t.deepEqual(_.pick(err, 'name', 'message', 'code'), { name: 'Error', message: 'Unexpected ttsd error(123)', code: 123 })
      t.end()
    })
})

test('descriptor should transfer error events for impatient clients', t => {
  t.plan(4)

  var tt = bootstrap()
  mm.mockPromise(tt.runtime, 'ttsMethod', () => {
    setTimeout(() => {
      tt.runtime.descriptor.tts.handleEvent('start', '1', 'test')
      tt.runtime.descriptor.tts.handleEvent('error', '1', 'test', 123)
    }, 1000)
    return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
  })

  var bridge = tt.getBridge({ appId: 'test' })
  ;['start'].forEach(it => {
    bridge.subscribe('tts', it, (ttsId) => {
      t.strictEqual(ttsId, '1')
    })
  })
  ;['error'].forEach(it => {
    bridge.subscribe('tts', it, (ttsId, errno) => {
      t.strictEqual(ttsId, '1')
      t.strictEqual(errno, 123)
      t.end()
    })
  })

  bridge.invoke('tts', 'speak', [ 'foobar', { impatient: true } ])
    .then((ttsId) => {
      t.strictEqual(ttsId, '1')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
