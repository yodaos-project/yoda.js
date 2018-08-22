'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

function ExtApp (appId, dbusConn, runtime) {
  EventEmitter.call(this)
  this.appId = appId
  this.dbusConn = dbusConn
  this.runtime = runtime

  this.on('create', this._onEvent.bind(this, 'create', appId))
  this.on('restart', this._onEvent.bind(this, 'restart', appId))
  this.on('pause', this._onEvent.bind(this, 'pause', appId))
  this.on('resume', this._onEvent.bind(this, 'resume', appId))
  this.on('stop', this._onEvent.bind(this, 'stop', appId))
  this.on('destroy', this._onEvent.bind(this, 'destroy', appId))
  this.on('voice_command', this._onEvent.bind(this, 'voiceCommand', appId))
  this.on('key_event', this._onEvent.bind(this, 'keyEvent', appId))
}
inherits(ExtApp, EventEmitter)

ExtApp.prototype._onEvent = function (name) {
  var eventName = null
  var params = Array.prototype.slice.call(arguments, 1)
  switch (name) {
    case 'create':
      eventName = 'onCreate'
      break
    case 'restart':
      eventName = 'onRestart'
      break
    case 'pause':
      eventName = 'onPause'
      break
    case 'resume':
      eventName = 'onResume'
      break
    case 'stop':
      eventName = 'onStop'
      break
    case 'destroy':
      eventName = 'onDestroy'
      break
    case 'voiceCommand':
      eventName = 'nlp'
      params = [
        params[0],
        JSON.stringify(params[1]),
        JSON.stringify(params[2])
      ]
      break
    default:
      eventName = null
      break
  }

  if (!eventName) {
    return
  }
  this.runtime.service._dbus.emitSignal(
    this.dbusConn.objectPath,
    this.dbusConn.ifaceName,
    eventName,
    params.map(() => {
      return 's'
    }).join(''),
    params
  )
}

module.exports = ExtApp
