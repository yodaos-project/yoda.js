'use strict'

var logger = require('logger')('ttsdService')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var Dbus = require('dbus')

var property = require('@yoda/property')
var TtsWrap = require('@yoda/tts')
var AudioManager = require('@yoda/audio').AudioManager

var Remote = require('../../lib/dbus-remote-call.js')
var dbusService = Dbus.registerService('session', 'com.service.tts')
var lightd = new Remote(dbusService._dbus, {
  dbusService: 'com.service.light',
  dbusObjectPath: '/rokid/light',
  dbusInterface: 'com.rokid.light.key'
})

var audioModuleName = 'tts'

function Tts () {
  EventEmitter.call(this)
  this.config = undefined
  this.nativeWrap = undefined
  this.handle = {}
  this.registry = {}

  // the role of these codes is to simulate tts recovery.
  this.lastText = ''
  this.lastAppId = ''
  this.lastReqId = -1
  /**
   * the purpose of this variable is to declare whether to ignore the tts event.
   */
  this.ignoreTtsEvent = false

  this.pausedAppIdOnAwaken = null

  AudioManager.setPlayingState(audioModuleName, false)
}
inherits(Tts, EventEmitter)

Tts.prototype.speak = function (appId, text) {
  if (this.lastAppId === appId && this.lastReqId > -1) {
    logger.info('emit simulated cancel event for app', this.lastReqId)
    this.emit('cancel', this.lastAppId, this.lastReqId)
    this.ignoreTtsEvent = false
  }

  if (this.handle[appId]) {
    try {
      this.handle[appId].stop()
      delete this.handle[appId]
    } catch (error) {
      logger.error(`try to stop prev tts failed with appId: ${appId}`, error.stack)
      return -1
    }
  }

  var req
  try {
    req = this.nativeWrap.speak(text)
  } catch (err) {
    logger.error('registering tts failure', err.stack)
    return -1
  }
  this.handle[appId] = req
  this.lastAppId = appId
  this.lastText = text
  this.lastReqId = req.id
  return req.id
}

Tts.prototype.stop = function (appId) {
  if (this.ignoreTtsEvent && this.lastAppId === appId && this.lastReqId > -1) {
    logger.info('emit simulated cancel event for app', this.lastReqId)
    this.emit('cancel', this.lastAppId, this.lastReqId)
    this.lastAppId = ''
    this.lastText = ''
    this.lastReqId = -1
    this.ignoreTtsEvent = false
    return
  }

  if (this.lastAppId === appId) {
    this.ignoreTtsEvent = false
  }

  if (this.handle[appId]) {
    this.handle[appId].stop()
    delete this.handle[appId]
  }
  if (appId === this.lastAppId) {
    this.lastAppId = ''
    this.lastText = ''
    this.lastReqId = -1
  }
}

Tts.prototype.pause = function (appId) {
  this.ignoreTtsEvent = true
  if (this.handle[appId]) {
    try {
      this.handle[appId].stop()
      delete this.handle[appId]
    } catch (error) {
      logger.error('try to stop tts failure', error)
    }
  }
}

Tts.prototype.resume = function (appId) {
  if (this.handle[appId]) {
    return
  }
  var req
  if (appId === this.lastAppId && this.lastText && this.lastReqId > -1) {
    logger.log(`tts resume by OS with appId: ${appId}`)
    try {
      req = this.nativeWrap.speak(this.lastText)
      this.handle[appId] = req
      // support multiple resume, not reset lastText and lastReqId
      req.id = this.lastReqId
      this.lastAppId = appId
    } catch (error) {
      logger.error('tts respeak error', error)
    }
  }
}

Tts.prototype.reset = function () {
  this.ignoreTtsEvent = false
  try {
    for (var index in this.handle) {
      this.handle[index].stop()
    }
  } catch (error) {
    logger.error('error when try to stop all tts', error.stack)
  }
  this.lastText = ''
  this.lastAppId = ''
  this.lastReqId = -1
  this.handle = {}
}

Tts.prototype.onStart = function onStart (id, errno) {
  logger.log('ttsd start', id, this.lastReqId, this.ignoreTtsEvent)
  AudioManager.setPlayingState(audioModuleName, true)
  lightd.invoke('play',
    ['@yoda/ttsd', '/opt/light/setSpeaking.js', '{}', '{"shouldResume":true}'])

  if (this.ignoreTtsEvent && this.lastReqId === id) {
    logger.log(`ignore tts start event with id: ${id}`)
    this.ignoreTtsEvent = false
    return
  }
  this.registry[id] = Date.now()
  this.emit('start', +id, this.lastAppId)
}

Tts.prototype.onTtsTermination = function onTtsTermination (event, id, errno) {
  logger.info(`ttsd ${event} ${id}`)
  var appId = this.lastAppId
  if (this.lastReqId === id) {
    this.lastReqId = -1
    this.lastAppId = ''
    this.lastText = ''
  }
  AudioManager.setPlayingState(audioModuleName, false)
  lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])

  if (this.ignoreTtsEvent && this.lastReqId === id) {
    logger.info(`ignore tts ${event} event with id: ${id}`)
    return
  }
  this.ignoreTtsEvent = false
  var start = this.registry[id] || 0
  delete this.registry[id]
  var delta = Date.now() - start
  /** delay to 2s to prevent event `end` been received before event `start` */
  setTimeout(() => {
    this.emit(event, '' + id, appId, errno)
  }, 2000 - delta/** it's ok to set a negative timeout */)
}

Tts.prototype.connect = function connect (CONFIG) {
  if (this.config &&
    this.config.deviceId === CONFIG.deviceId &&
    this.config.deviceTypeId === CONFIG.deviceTypeId &&
    this.config.key === CONFIG.key &&
    this.config.secret === CONFIG.secret) {
    logger.log('reconnect with same config')
    this.nativeWrap.reconnect()
    return
  }
  // for detail, see https://developer.rokid.com/docs/3-ApiReference/openvoice-api.html#ttsrequest
  CONFIG.declaimer = property.get('rokid.tts.declaimer', 'persist')
  CONFIG.holdConnect = true
  if (property.get('player.ttsd.holdcon', 'persist') === '0') {
    CONFIG.holdConnect = false
  }
  if (this.nativeWrap) {
    this.nativeWrap.disconnect()
  }

  this.nativeWrap = TtsWrap.createTts(CONFIG)
  this.config = CONFIG

  this.nativeWrap.on('start', this.onStart.bind(this))
  this.nativeWrap.on('end', this.onTtsTermination.bind(this, 'end'))
  this.nativeWrap.on('cancel', this.onTtsTermination.bind(this, 'cancel'))
  this.nativeWrap.on('error', this.onTtsTermination.bind(this, 'error'))
}

module.exports = Tts
