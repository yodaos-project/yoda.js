var test = require('tape')
var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var Turen = require(`${helper.paths.runtime}/lib/component/turen`)

function mockDaemonProxies (runtime) {
  mock.mockReturns(runtime.light, 'play', Promise.resolve())
  mock.mockReturns(runtime.light, 'stop', Promise.resolve())
  mock.mockReturns(runtime.light, 'appSound', Promise.resolve())
  mock.mockReturns(runtime, 'ttsMethod', Promise.resolve())
  mock.mockReturns(runtime, 'multimediaMethod', Promise.resolve())
}

test('shall handle voice coming', t => {
  var runtime = new AppRuntime()
  var turen = new Turen(runtime)

  mock.mockReturns(runtime.custodian, 'isPrepared', true)
  mockDaemonProxies(runtime)

  turen.handleEvent('voice coming', {})
    .then(() => {
      t.strictEqual(turen.awaken, true, 'turen shall be awaken on voice coming')

      runtime.destruct()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.destruct()
      t.end()
    })
})
