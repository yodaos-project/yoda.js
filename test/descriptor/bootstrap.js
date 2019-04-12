var helper = require('../helper')
var bootRuntime = require('../bootstrap.js')
var AppBridge = require(`${helper.paths.runtime}/app/app-bridge`)
var kRunning = require(`${helper.paths.runtime}/constants`).AppScheduler.status.running

module.exports = function bootstrap () {
  var tt = bootRuntime()
  var runtime = tt.runtime
  var component = tt.component
  return Object.assign(tt, {
    getBridge: (ctx) => {
      var bridge = new AppBridge(runtime, ctx.appId)
      component.appScheduler.appMap[ctx.appId] = bridge
      component.appScheduler.appStatus[ctx.appId] = kRunning
      component.appScheduler.appLaunchOptions[ctx.appId] = {}
      component.lifetime.activateAppById(ctx.appId)
      return bridge
    }
  })
}
