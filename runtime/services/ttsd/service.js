'use strict'

var logger = require('logger')('ttsdService')
var AudioManager = require('@yoda/audio').AudioManager

function Tts (options) {
  this.handle = {}
  this.options = options
}

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
      logger.log(`try to stop prev tts failed with appId: ${appId}`)
    }
  }
  try {
    req = this.options.tts.speak(text)
    this.handle[appId] = req
    return req.id
  } catch (err) {
    return -1
  }
}

Tts.prototype.stop = function (appId) {
  if (this.handle[appId]) {
    this.handle[appId].stop()
    delete this.handle[appId]
  }
}

Tts.prototype.reset = function () {
  try {
    for (var index in this.handle) {
      this.handle[index].stop()
    }
  } catch (error) {
    logger.log('error when try to stop all tts')
  }
  this.handle = {}
}

module.exports = Tts
