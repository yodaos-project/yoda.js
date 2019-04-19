var EventEmitter = require('events')

var bootRuntime = require('../../bootstrap')
var mm = require('../../helper/mock')

module.exports = function bootstrap () {
  var tt = bootRuntime()
  var scheduler = tt.component.appScheduler

  var bus = new EventEmitter()
  mm.mockReturns(tt.runtime, 'appDidExit', true)
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'test')
  scheduler.appCreationHandler.test = function (appId, metadata, bridge) {
    bus.emit('create', appId, bridge)
    return Promise.resolve(bridge)
  }
  mm.proxyFunction(scheduler, 'suspendApp', {
    after: (future, self, args) => {
      var appId = args[0]
      self.handleAppExit(appId)
      bus.emit('suspend', appId)
      return future
    }
  })

  return Object.assign(tt, { bus: bus })
}
