'use strict'

var logger = require('logger')('ttsdService')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var AudioManager = require('@yoda/audio').AudioManager

function Tts (options) {
  EventEmitter.call(this)
  this.handle = {}
  this.options = options

  // author: sudo<xiaofei.lan@rokid.com>
  // the role of these codes is to simulate tts recovery.
  this.lastText = ''
  this.lastAppId = ''
  this.lastReqId = -1
}
inherits(Tts, EventEmitter)

Tts.prototype.speak = function (appId, text) {
  // unmute if current is muted.
  if (AudioManager.isMuted()) {
    AudioManager.setMute(false)
  }
  var req
  if (this.handle[appId]) {
    try {
      this.handle[appId].stop()
      delete this.handle[appId]
    } catch (error) {
      logger.error(`try to stop prev tts failed with appId: ${appId}`, error.stack)
      return -1
    }
  }
  try {
    req = this.options.tts.speak(text)
    this.handle[appId] = req
    this.lastAppId = appId
    this.lastText = text
    this.lastReqId = req.id
    return req.id
  } catch (err) {
    logger.error('registering tts failure', err.stack)
    return -1
  }
}

Tts.prototype.stop = function (appId) {
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
      req = this.options.tts.speak(this.lastText)
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

module.exports = Tts
