var test = require('tape')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var Turen = require(`${helper.paths.runtime}/lib/component/turen`)

var turenHelper = require('./helper')
var getAppRuntime = turenHelper.getAppRuntime
var mockDaemonProxies = turenHelper.mockDaemonProxies
var postMessage = turenHelper.postMessage

test('manually pick up should clear memos of app id on voice coming', t => {
  t.plan(3)
  var runtime = getAppRuntime()
  var turen = new Turen(runtime)

  mockDaemonProxies(runtime)

  mock.mockReturns(runtime.component.lifetime, 'getCurrentAppId', 'before_voice_coming')
  mock.mockPromise(runtime.component.dispatcher, 'delegate', null, false)
  postMessage(turen, 'rokid.turen.voice_coming')
    .then(() => {
      t.strictEqual(turen.appIdOnVoiceComing, 'before_voice_coming')
      mock.mockReturns(runtime.component.flora, 'post', (name, msg) => {
        if (name === 'rokid.turen.pickup') {
          t.deepEqual(msg, [ 1 ])
        }
      })
      turen.pickup(true)
    })
    .then(() => {
      t.looseEqual(turen.appIdOnVoiceComing, null)
      mock.mockReturns(runtime.component.flora, 'post')
    })
    .then(() => {
      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})
