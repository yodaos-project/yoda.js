var test = require('tape')
var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')

var _ = require('@yoda/util')._
var helper = require('../../helper')
var mock = require('../../helper/mock')
var Turen = require(`${helper.paths.runtime}/lib/component/turen`)

function mockDaemonProxies (runtime) {
  mock.mockReturns(runtime.component.light, 'play', Promise.resolve())
  mock.mockReturns(runtime.component.light, 'stop', Promise.resolve())
  mock.mockReturns(runtime.component.light, 'appSound', Promise.resolve())
  mock.mockReturns(runtime.component.light, 'lightMethod', Promise.resolve())
  mock.mockReturns(runtime, 'ttsMethod', Promise.resolve())
  mock.mockReturns(runtime, 'multimediaMethod', Promise.resolve())
}

function postMessage (turen, name, msg) {
  var handler = turen.handlers[name]
  if (handler == null) {
    throw new Error(`Cannot handle unknown message ${name}`)
  }
  return Promise.resolve(handler.apply(turen, [ msg ]))
}

test('shall handle voice coming', t => {
  var runtime = new AppRuntime()
  var turen = new Turen(runtime)

  mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
  mockDaemonProxies(runtime)

  postMessage(turen, 'rokid.turen.voice_coming')
    .then(() => {
      t.strictEqual(turen.awaken, true, 'turen shall be awaken on voice coming')
      t.strictEqual(turen.pickingUpDiscardNext, false, 'should reset pickingUpDiscardNext on voice coming')
      return _.delay(turen.solitaryVoiceComingTimeout)
    })
    .then(() => {
      t.strictEqual(turen.pickingUpDiscardNext, false, 'closing pick up on solitary voice coming shall not discard next')

      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})

test('speech network error on middle of asr processing', t => {
  t.plan(2)
  var runtime = new AppRuntime()
  var turen = new Turen(runtime)

  mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
  mockDaemonProxies(runtime)

  postMessage(turen, 'rokid.turen.voice_coming')
    .then(() => postMessage(turen, 'rokid.turen.local_awake', [ 0 ]))
    .then(() => postMessage(turen, 'rokid.speech.inter_asr', [ 'asr' ]))
    .then(() => {
      mock.mockPromise(turen, 'announceNetworkLag', () => {
        t.pass('should announce network lag on speech error > 100')
      })
    })
    .then(() => postMessage(turen, 'rokid.speech.error', [ 103, 100 ]))
    .then(() => {
      t.strictEqual(turen.awaken, false, 'turen shall not be awaken on end of speech error')

      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})

test('speech network error on end of asr processing', t => {
  t.plan(2)
  var runtime = new AppRuntime()
  var turen = new Turen(runtime)

  mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
  mockDaemonProxies(runtime)

  postMessage(turen, 'rokid.turen.voice_coming')
    .then(() => postMessage(turen, 'rokid.turen.local_awake', [ 0 ]))
    .then(() => postMessage(turen, 'rokid.speech.inter_asr', [ 'asr' ]))
    .then(() => postMessage(turen, 'rokid.speech.final_asr', [ 'asr' ]))
    .then(() => {
      mock.mockPromise(turen, 'announceNetworkLag', () => {
        t.pass('should announce network lag on speech error > 100')
      })
    })
    .then(() => postMessage(turen, 'rokid.speech.error', [ 103, 100 ]))
    .then(() => {
      t.strictEqual(turen.awaken, false, 'turen shall not be awaken on end of speech error')

      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})

test('speech error 8 on middle of asr processing', t => {
  t.plan(2)
  var runtime = new AppRuntime()
  var turen = new Turen(runtime)

  mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
  mockDaemonProxies(runtime)

  postMessage(turen, 'rokid.turen.voice_coming')
    .then(() => postMessage(turen, 'rokid.turen.local_awake', [ 0 ]))
    .then(() => postMessage(turen, 'rokid.speech.inter_asr', [ 'asr' ]))
    .then(() => {
      mock.mockPromise(turen, 'announceNetworkLag', () => {
        t.fail('should not announce network lag on speech error 8')
      })
      mock.mockPromise(turen, 'recoverPausedOnAwaken', () => {
        t.pass('should recover paused media on awaken on speech error 8')
      })
    })
    .then(() => postMessage(turen, 'rokid.speech.error', [ 8, 100 ]))
    .then(() => {
      t.strictEqual(turen.awaken, false, 'turen shall not be awaken on end of speech error')

      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})

test('speech error 8 on middle of asr processing', t => {
  t.plan(2)
  var runtime = new AppRuntime()
  var turen = new Turen(runtime)

  mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
  mockDaemonProxies(runtime)

  postMessage(turen, 'rokid.turen.voice_coming')
    .then(() => postMessage(turen, 'rokid.turen.local_awake', [ 0 ]))
    .then(() => postMessage(turen, 'rokid.speech.inter_asr', [ 'asr' ]))
    .then(() => postMessage(turen, 'rokid.speech.final_asr', [ 'asr' ]))
    .then(() => {
      mock.mockPromise(turen, 'announceNetworkLag', () => {
        t.fail('should not announce network lag on speech error 8')
      })
      mock.mockPromise(turen, 'recoverPausedOnAwaken', () => {
        t.pass('should recover paused media on awaken on speech error 8')
      })
    })
    .then(() => postMessage(turen, 'rokid.speech.error', [ 8, 100 ]))
    .then(() => {
      t.strictEqual(turen.awaken, false, 'turen shall not be awaken on end of speech error')

      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})
