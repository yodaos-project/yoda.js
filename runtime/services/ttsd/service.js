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
  var req = this.options.tts.speak(text)
  if (this.handle[appId]) {
    try {
      this.handle[appId].stop()
      delete this.handle[appId]
      this.handle[appId] = req
    } catch (error) {
      logger.log(`try to stop prev tts failed with appId: ${appId}`)
    }
  }
  return req.id
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
