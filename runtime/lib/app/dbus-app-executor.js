var EventEmitter = require('events')
var inherits = require('util').inherits
var logger = require('logger')('dbus-app')

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

function DbusApp (appId, objectPath, ifaceName, dbusService) {
  EventEmitter.call(this)
  this.appId = appId
  this.objectPath = objectPath
  this.ifaceName = ifaceName
  this.dbusService = dbusService

  this.on('resume', this._onEvent.bind(this, 'resume', appId))
  this.on('pause', this._onEvent.bind(this, 'pause', appId))
  this.on('destroy', this._onEvent.bind(this, 'destroy', appId))
  this.on('request', this._onEvent.bind(this, 'request', appId))
}
inherits(DbusApp, EventEmitter)

DbusApp.prototype._onEvent = function (name) {
  var params = Array.prototype.slice.call(arguments, 1)
  var eventName
  switch (name) {
    case 'resume':
      eventName = 'onResume'
      params = [
        params[0]
      ]
      break
    case 'pause':
      eventName = 'onPause'
      params = [
        params[0]
      ]
      break
    case 'destroy':
      eventName = 'onStop'
      params = [
        params[0]
      ]
      break
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
