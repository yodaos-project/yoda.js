var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')

var mock = require('../../helper/mock')

module.exports.mockDaemonProxies = mockDaemonProxies
function mockDaemonProxies (runtime) {
  mock.mockReturns(runtime.component.light, 'play', Promise.resolve())
  mock.mockReturns(runtime.component.light, 'stop', Promise.resolve())
  mock.mockReturns(runtime.component.light, 'appSound', Promise.resolve())
  mock.mockReturns(runtime.component.light, 'lightMethod', Promise.resolve())
  mock.mockReturns(runtime, 'ttsMethod', Promise.resolve())
  mock.mockReturns(runtime, 'multimediaMethod', Promise.resolve())
}

module.exports.postMessage = postMessage
function postMessage (turen, name, msg) {
  var handler = turen.handlers[name]
  if (handler == null) {
    throw new Error(`Cannot handle unknown message ${name}`)
  }
  return Promise.resolve(handler.apply(turen, [ msg ]))
}

module.exports.getAppRuntime = getAppRuntime
function getAppRuntime () {
  var runtime = new AppRuntime()
  runtime.__temporaryDisablingReasons = []
  return runtime
}
