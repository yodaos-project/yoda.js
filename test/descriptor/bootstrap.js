var AppRuntime = require('../helper/mock-runtime')
var helper = require('../helper')
var AppBridge = require(`${helper.paths.runtime}/lib/app/app-bridge`)
var kRunning = require(`${helper.paths.runtime}/constants`).AppScheduler.status.running

module.exports = function bootstrap () {
  var runtime = new AppRuntime()
  return {
    runtime: runtime,
    getBridge: (ctx) => {
      var bridge = new AppBridge(runtime, ctx.appId)
      runtime.component.appScheduler.appMap[ctx.appId] = bridge
      runtime.component.appScheduler.appStatus[ctx.appId] = kRunning
      runtime.component.appScheduler.appLaunchOptions[ctx.appId] = {}
      runtime.component.lifetime.activateAppById(ctx.appId)
      return bridge
    }
  }
}
