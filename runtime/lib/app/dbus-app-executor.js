var logger = require('logger')('dbus-app')
var DbusApp = require('./dbus-app')

module.exports = Executor
function Executor (objectPath, ifaceName, appId, runtime) {
  this.objectPath = objectPath
  this.ifaceName = ifaceName
  this.appId = appId
  this.runtime = runtime
  this.app = null
}

Executor.prototype.create = function () {
  this.app = new DbusApp(this.appId, this.objectPath, this.ifaceName, this.runtime.dbusRegistry.service)
  logger.info('created dbus app', this.appId)
  return Promise.resolve(this.app)
}

Executor.prototype.destruct = function destruct () {
  this.app = null
  return Promise.resolve()
}
