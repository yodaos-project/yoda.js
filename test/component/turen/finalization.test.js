var test = require('tape')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var Turen = require(`${helper.paths.runtime}/lib/component/turen`)

var turenHelper = require('./helper')
var getAppRuntime = turenHelper.getAppRuntime
var mockDaemonProxies = turenHelper.mockDaemonProxies
var postMessage = turenHelper.postMessage

test('shall enable turen wake up engine on speech completion regardless of muted or not', t => {
  t.plan(1)
  var runtime = getAppRuntime()
  var turen = new Turen(runtime)

  mockDaemonProxies(runtime)

  turen.muted = true
  mock.mockReturns(runtime, 'hasBeenDisabled', true)
  mock.mockReturns(runtime.component.flora, 'post', (name, msg) => {
    if (name === 'rokid.turen.disable.wakeupEngine') {
      t.deepEqual(msg, [ 0 ])
    }
  })
  postMessage(turen, 'rokid.speech.completed')
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
