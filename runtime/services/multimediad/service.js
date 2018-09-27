'use strict'

var EventEmitter = require('events').EventEmitter
var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var inherits = require('util').inherits
var logger = require('logger')('multimediaService')

function MultiMedia () {
  EventEmitter.call(this)
  this.handle = {}
}
inherits(MultiMedia, EventEmitter)

MultiMedia.prototype.start = function (appId, url, streamType) {
  if (this.handle[appId]) {
    try {
      var id = this.handle[appId].id
      this.emit('cancel', '' + id)
      this.handle[appId].stop()
      delete this.handle[appId]
    } catch (error) {
      logger.log(`try to stop prev player error, appId: ${appId}`)
    }
  }
  var player
  if (streamType === 'alarm') {
    player = new MediaPlayer(AudioManager.STREAM_ALARM)
  } else {
    player = new MediaPlayer(AudioManager.STREAM_PLAYBACK)
  }
  this.listenEvent(player, appId)
  player.start(url)
  this.handle[appId] = player
  return player.id
}

MultiMedia.prototype.stop = function (appId) {
  if (this.handle[appId]) {
    try {
      var id = this.handle[appId].id
      this.emit('cancel', '' + id)
      this.handle[appId].stop()
      delete this.handle[appId]
    } catch (error) {
      logger.debug('try to stop player errer with appId: ', appId)
    }
    delete this.handle[appId]
  }
}

MultiMedia.prototype.pause = function (appId) {
  if (this.handle[appId]) {
    try {
      this.handle[appId].pause()
    } catch (error) {
      logger.debug('try to pause player errer with appId: ', appId)
    }
  }
}

MultiMedia.prototype.resume = function (appId) {
  try {
    if (this.handle[appId] && !this.handle[appId].playing) {
      this.handle[appId].resume()
    }
  } catch (error) {
    logger.debug('try to resume player errer with appId: ', appId)
  }
}

MultiMedia.prototype.getPosition = function (appId) {
  if (this.handle[appId]) {
    return this.handle[appId].position
  }
  return -1
}

MultiMedia.prototype.getLoopMode = function (appId) {
  if (this.handle[appId]) {
    return this.handle[appId].loopMode
  }
  return false
}

MultiMedia.prototype.setLoopMode = function (appId, mode) {
  if (this.handle[appId]) {
    this.handle[appId].loopMode = mode === 'true'
  }
}

MultiMedia.prototype.seek = function (appId, position, callback) {
  if (this.handle[appId]) {
    try {
      this.handle[appId].seek(position, callback)
    } catch (error) {
      logger.debug('try to seek player errer with appId: ', appId)
      return callback(new Error('player error'))
    }
    callback()
  } else {
    callback(new Error('player instance not found'))
  }
}

MultiMedia.prototype.listenEvent = function (player, appId) {
  player.on('prepared', () => {
    this.emit('prepared', '' + player.id, '' + player.duration, '' + player.position)
  })
  player.on('playbackcomplete', () => {
    // free handle after playbackcomplete
    try {
      this.handle[appId].stop()
    } catch (error) {
      logger.debug(`try to stop player error with appId: ${appId}`)
    }
    delete this.handle[appId]
    this.emit('playbackcomplete', '' + player.id)
  })
  player.on('bufferingupdate', () => {
    this.emit('bufferingupdate', '' + player.id)
  })
  player.on('seekcomplete', () => {
    this.emit('seekcomplete', '' + player.id)
  })
  player.on('error', () => {
    // free handle when something goes wrong
    try {
      this.handle[appId].stop()
    } catch (error) {
      logger.debug(`try to stop player error with appId: ${appId}`)
    }
    delete this.handle[appId]
    this.emit('error', '' + player.id)
  })
}

MultiMedia.prototype.reset = function () {
  try {
    for (var index in this.handle) {
      this.handle[index].stop()
    }
  } catch (error) {
    logger.log('error when try to stop all player')
  }
  this.handle = {}
}

module.exports = MultiMedia
