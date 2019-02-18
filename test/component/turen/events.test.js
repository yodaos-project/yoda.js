var test = require('tape')

var _ = require('@yoda/util')._
var helper = require('../../helper')
var mock = require('../../helper/mock')
var Turen = require(`${helper.paths.runtime}/lib/component/turen`)

var turenHelper = require('./helper')
var getAppRuntime = turenHelper.getAppRuntime
var mockDaemonProxies = turenHelper.mockDaemonProxies
var postMessage = turenHelper.postMessage

test('shall handle voice coming', t => {
  t.plan(4)
  var runtime = getAppRuntime()
  var turen = new Turen(runtime)

  mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
  mockDaemonProxies(runtime)

  postMessage(turen, 'rokid.turen.voice_coming')
    .then(() => {
      t.strictEqual(turen.awaken, true, 'turen shall be awaken on voice coming')
      t.strictEqual(turen.pickingUpDiscardNext, false, 'should reset pickingUpDiscardNext on voice coming')
      t.looseEqual(turen.noVoiceInputTimer, null, 'no voice input timer should be cleared')
      return _.delay(Turen.solitaryVoiceComingTimeout)
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

function testSpeechNetworkErrorCode (code) {
  test(`speech error ${code} should be ignored on muted`, t => {
    t.plan(1)
    var runtime = getAppRuntime()
    var turen = new Turen(runtime)

    mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
    mockDaemonProxies(runtime)

    postMessage(turen, 'rokid.turen.voice_coming')
      .then(() => postMessage(turen, 'rokid.turen.local_awake', [ 0 ]))
      .then(() => postMessage(turen, 'rokid.speech.inter_asr', [ 'asr' ]))
      .then(() => {
        mock.mockPromise(turen, 'announceNetworkLag', () => {
          t.fail('should not announce network lag on muted')
        })
        turen.muted = true
      })
      .then(() => postMessage(turen, 'rokid.speech.error', [ code, 100 ]))
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

  test(`speech error ${code} on middle of asr processing`, t => {
    t.plan(2)
    var runtime = getAppRuntime()
    var turen = new Turen(runtime)

    mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
    mockDaemonProxies(runtime)

    postMessage(turen, 'rokid.turen.voice_coming')
      .then(() => postMessage(turen, 'rokid.turen.local_awake', [ 0 ]))
      .then(() => postMessage(turen, 'rokid.speech.inter_asr', [ 'asr' ]))
      .then(() => {
        mock.proxyFunction(turen, 'announceNetworkLag', {
          before: () => {
            t.pass('should announce network lag on speech error > 100')
          }
        })
      })
      .then(() => postMessage(turen, 'rokid.speech.error', [ code, 100 ]))
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

  test(`speech error ${code} on end of asr processing`, t => {
    t.plan(2)
    var runtime = getAppRuntime()
    var turen = new Turen(runtime)

    mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
    mockDaemonProxies(runtime)

    postMessage(turen, 'rokid.turen.voice_coming')
      .then(() => postMessage(turen, 'rokid.turen.local_awake', [ 0 ]))
      .then(() => postMessage(turen, 'rokid.speech.inter_asr', [ 'asr' ]))
      .then(() => postMessage(turen, 'rokid.speech.final_asr', [ 'asr' ]))
      .then(() => {
        mock.proxyFunction(turen, 'announceNetworkLag', {
          before: () => {
            t.pass('should announce network lag on speech error > 100')
          }
        })
      })
      .then(() => postMessage(turen, 'rokid.speech.error', [ code, 100 ]))
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
}

testSpeechNetworkErrorCode(6)
testSpeechNetworkErrorCode(100)
testSpeechNetworkErrorCode(999)

test('speech error 8 on middle of asr processing', t => {
  t.plan(2)
  var runtime = getAppRuntime()
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
      mock.proxyFunction(turen, 'recoverPausedOnAwaken', {
        before: () => {
          t.pass('should recover paused media on awaken on speech error 8')
        }
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

test('speech error 8 on end of asr processing', t => {
  t.plan(2)
  var runtime = getAppRuntime()
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
      mock.proxyFunction(turen, 'recoverPausedOnAwaken', {
        before: () => {
          t.pass('should recover paused media on awaken on speech error 8')
        }
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

test('speech error 8 should deactivate app memorized on voice coming', t => {
  t.plan(3)
  var runtime = getAppRuntime()
  var turen = new Turen(runtime)

  mock.mockReturns(runtime.component.lifetime, 'getCurrentAppId', () => {
    return 'before_voice_coming'
  })
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
      mock.proxyFunction(turen, 'recoverPausedOnAwaken', {
        before: () => {
          t.pass('should recover paused media on awaken on speech error 8')
        }
      })

      mock.mockReturns(runtime.component.lifetime, 'getCurrentAppId', () => {
        return 'after_voice_coming'
      })
      mock.mockPromise(runtime.component.lifetime, 'deactivateCutApp', (options) => {
        t.deepEqual(options, { appId: 'before_voice_coming' })
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
