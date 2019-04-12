var EventEmitter = require('events')
var _ = require('@yoda/util')._
var inherits = require('util').inherits

module.exports = DbusApp
function DbusApp (appId, manifest, runtime) {
  EventEmitter.call(this)
  this.appId = appId
  this.objectPath = _.get(manifest, 'objectPath')
  this.ifaceName = _.get(manifest, 'ifaceName')
  this.dbusService = runtime.component.dbusRegistry.service

  this.on('ready', this._onEvent.bind(this, 'ready', appId))
  this.on('resume', this._onEvent.bind(this, 'resume', appId))
  this.on('pause', this._onEvent.bind(this, 'pause', appId))
  this.on('destroy', this._onEvent.bind(this, 'destroy', appId))
  this.on('request', this._onEvent.bind(this, 'request', appId))
  this.tts = new EventEmitter()
  ;[
    'end',
    'cancel',
    'error'
  ].forEach(it => {
    this.tts.on(it, this._onEvent.bind(this, 'onTtsComplete', appId))
  })
}
inherits(DbusApp, EventEmitter)

DbusApp.prototype._onEvent = function (name) {
  var params = Array.prototype.slice.call(arguments, 1)
  var eventName = name
  switch (name) {
    case 'ready':
      eventName = 'onReady'
      params = [
        params[0]
      ]
      break
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
    case 'onTtsComplete':
      params = [
        params[0]
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
