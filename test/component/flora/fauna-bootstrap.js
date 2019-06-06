var bootstrap = require('../../bootstrap')
var helper = require('../../helper')
var AppBridge = require(`${helper.paths.runtime}/app/app-bridge`)

module.exports = function faunaBootstrap () {
  var suite = bootstrap()
  var appScheduler = suite.component.appScheduler
  suite.mockApp = function mockApp (appId, pid, status) {
    var bridge = new AppBridge(suite.runtime, appId)
    appScheduler.appMap[appId] = bridge
    appScheduler.pidAppIdMap[pid] = appId
    appScheduler.appStatus[appId] = status || 'running'
    return bridge
  }
  suite.floraCall = function floraCall (name, req, sender) {
    return new Promise(resolve => {
      var flora = suite.component.flora
      flora.remoteMethods[name].call(flora, req, {
        end: (code, msg) => {
          resolve({ code: code, msg: msg })
        }
      }, sender)
    })
  }
  return suite
}
