var EventEmitter = require('events')
var inherits = require('util').inherits

module.exports = Executor
function Executor (objectPath, ifaceName, appId, runtime) {
  this.objectPath = objectPath
  this.ifaceName = ifaceName
  this.appId = appId
  this.runtime = runtime
  this.app = null
}

Executor.prototype.create = function () {
  this.app = new DbusApp(this.appId, this.objectPath, this.ifaceName, this.runtime.service)

  return Promise.resolve(this.app)
}

Executor.prototype.destruct = function destruct () {
  this.app = null
  return Promise.resolve()
}

function DbusApp (appId, objectPath, ifaceName, dbusService) {
  EventEmitter.call(this)
  this.appId = appId
  this.objectPath = objectPath
  this.ifaceName = ifaceName
  this.dbusService = dbusService

  this.on('request', this._onEvent.bind(this, 'request', appId))
}
inherits(DbusApp, EventEmitter)

DbusApp.prototype._onEvent = function (name) {
  var params = Array.prototype.slice.call(arguments, 1)
  var eventName
  switch (name) {
    case 'request':
      eventName = 'nlp'
      params = [
        params[0],
        JSON.stringify(params[1]),
        JSON.stringify(params[2])
      ]
      break
    default:
      break
  }

  if (eventName == null) {
    return
  }

  this.dbusService._dbus.emitSignal(
    this.objectPath,
    this.ifaceName,
    eventName,
    params.map(() => {
      return 's'
    }).join(''),
    params
  )
}
