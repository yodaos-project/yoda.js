var test = require('tape')
var EventEmitter = require('events')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var Turen = require(`${helper.paths.runtime}/lib/component/turen`)

var turenHelper = require('./helper')
var getAppRuntime = turenHelper.getAppRuntime
var mockDaemonProxies = turenHelper.mockDaemonProxies
var postMessage = turenHelper.postMessage

function createMockApp (runtime, appId) {
  var app = new EventEmitter()
  app.destruct = () => {}

  var component = runtime.component
  component.appScheduler.appMap[appId] = app
  component.appScheduler.appStatus[appId] = 'running'
  component.appScheduler.appLaunchOptions[appId] = {}
  return app
}

testSpeechErrorCodeOnEndOfAsr(8)
testSpeechErrorCodeOnEndOfAsr(100)
function testSpeechErrorCodeOnEndOfAsr (errCode) {
  test(`speech error ${errCode} on end of asr processing`, t => {
    t.plan(3)
    var runtime = getAppRuntime()
    var turen = new Turen(runtime)

    var cutApp = createMockApp(runtime, '1')
    var sceneApp = createMockApp(runtime, '2')

    mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
    mockDaemonProxies(runtime)

    Promise.resolve()
      .then(() => runtime.component.lifetime.activateAppById('2', 'scene'))
      .then(() => runtime.component.lifetime.activateAppById('1', 'cut'))
      .then(() => postMessage(turen, 'rokid.turen.voice_coming'))
      .then(() => postMessage(turen, 'rokid.turen.local_awake', [ 0 ]))
      .then(() => postMessage(turen, 'rokid.speech.inter_asr', [ 'asr' ]))
      .then(() => postMessage(turen, 'rokid.speech.final_asr', [ 'asr' ]))
      .then(() => {
        cutApp.on('destroy', () => {
          t.pass('cut app destroyed')
        })
        sceneApp.on('destroy', () => {
          t.fail('scene app should not be destroyed')
        })
        sceneApp.on('resume', () => {
          t.pass('scene app resumed')
        })
      })
      .then(() => postMessage(turen, 'rokid.speech.error', [ errCode, 100 ]))
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

test(`scene app should be resumed if cut app exited on middle of asr processing`, t => {
  t.plan(3)
  var runtime = getAppRuntime()
  var turen = new Turen(runtime)

  var cutApp = createMockApp(runtime, '1')
  var sceneApp = createMockApp(runtime, '2')

  mock.mockReturns(runtime.component.custodian, 'isPrepared', true)
  mockDaemonProxies(runtime)

  var listener
  Promise.resolve()
    .then(() => runtime.component.lifetime.activateAppById('2', 'scene'))
    .then(() => runtime.component.lifetime.activateAppById('1', 'cut'))
    .then(() => postMessage(turen, 'rokid.turen.voice_coming'))
    .then(() => postMessage(turen, 'rokid.turen.local_awake', [ 0 ]))
    .then(() => postMessage(turen, 'rokid.speech.inter_asr', [ 'asr' ]))
    .then(() => {
      cutApp.on('destroy', () => {
        t.pass('cut app destroyed')
      })
      listener = () => {
        t.fail('scene app should not be resumed on middle of waking up')
      }
      sceneApp.on('resume', listener)
      return runtime.component.lifetime.deactivateAppById()
    })
    .then(() => postMessage(turen, 'rokid.speech.final_asr', [ 'asr' ]))
    .then(() => {
      sceneApp.removeListener('resume', listener)
      sceneApp.on('destroy', () => {
        t.fail('scene app should not be destroyed')
      })
      sceneApp.on('resume', () => {
        t.pass('scene app resumed')
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
