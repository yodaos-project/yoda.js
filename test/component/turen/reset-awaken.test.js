var test = require('tape')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var Turen = require(`${helper.paths.runtime}/lib/component/turen`)

var turenHelper = require('./helper')
var getAppRuntime = turenHelper.getAppRuntime
var mockDaemonProxies = turenHelper.mockDaemonProxies

test('recoverPausedOnAwaken shall not pass null if the appid is null', t => {
  t.plan(2)
  var runtime = getAppRuntime()
  var turen = new Turen(runtime)

  mockDaemonProxies(runtime)
  mock.mockReturns(runtime.component.lifetime, 'getCurrentAppId', null)
  mock.mockReturns(runtime, 'ttsMethod', (name, args) => {
    t.strictEqual(name, 'resetAwaken')
    t.deepEqual(args, [ undefined ])
    return Promise.resolve()
  })
  turen.recoverPausedOnAwaken()
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
