'use strict'

var EventEmitter = require('events').EventEmitter
var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var inherits = require('util').inherits
var logger = require('logger')('multimediaService')
var audioModuleName = 'multimedia'
AudioManager.setPlayingState(audioModuleName, false)

function MultiMedia () {
  EventEmitter.call(this)
  this.handle = {}
  this.pausedAppIdOnAwaken = null
}
inherits(MultiMedia, EventEmitter)

MultiMedia.prototype.getCurrentlyPlayingAppId = function getCurrentlyPlayingAppId () {
  var keys = Object.keys(this.handle)
  for (var idx = 0; idx < keys.length; ++idx) {
    var appId = keys[idx]
    var handle = this.handle[appId]
    if (handle.playing) {
      return appId
    }
  }
  return null
}

MultiMedia.prototype.start = function (appId, url, streamType) {
  if (this.handle[appId]) {
    try {
      var id = this.handle[appId].id
      this.emit('cancel', '' + id)
      this.handle[appId].stop()
      delete this.handle[appId]
    } catch (error) {
      logger.error(`try to stop prev player error, appId: ${appId}`, error.stack)
      throw error
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
      AudioManager.setPlayingState(audioModuleName, false)
      delete this.handle[appId]
    } catch (error) {
      logger.error('try to stop player errer with appId: ', appId, error.stack)
    }
    delete this.handle[appId]
  }
}

MultiMedia.prototype.pause = function (appId) {
  if (this.handle[appId] == null) {
    return false
  }
  var playing = false
  try {
    playing = this.handle[appId].playing
  } catch (error) {
    logger.error('try to get playing state of player error with appId: ', appId, error.stack)
  }
  try {
    this.handle[appId].pause()
    AudioManager.setPlayingState(audioModuleName, false)
  } catch (error) {
    logger.error('try to pause player error with appId: ', appId, error.stack)
  }
  return playing
}

MultiMedia.prototype.resume = function (appId) {
  try {
    if (this.handle[appId] && !this.handle[appId].playing) {
      this.handle[appId].resume()
      AudioManager.setPlayingState(audioModuleName, true)
    }
  } catch (error) {
    logger.error('try to resume player errer with appId: ', appId, error.stack)
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
      logger.error('try to seek player errer with appId: ', appId, error.stack)
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
    AudioManager.setPlayingState(audioModuleName, true)
  })
  player.on('playbackcomplete', () => {
    // free handle after playbackcomplete
    try {
      this.handle[appId].stop()
    } catch (error) {
      logger.error(`try to stop player error with appId: ${appId}`, error.stack)
    }
    delete this.handle[appId]
    this.emit('playbackcomplete', '' + player.id)
    AudioManager.setPlayingState(audioModuleName, false)
  })
  player.on('bufferingupdate', () => {
    this.emit('bufferingupdate', '' + player.id)
  })
  player.on('seekcomplete', () => {
    this.emit('seekcomplete', '' + player.id)
    AudioManager.setPlayingState(audioModuleName, true)
  })
  player.on('error', () => {
    // free handle when something goes wrong
    try {
      this.handle[appId].stop()
    } catch (error) {
      logger.error(`try to stop player error with appId: ${appId}`, error.stack)
    }
    delete this.handle[appId]
    this.emit('error', '' + player.id)
    AudioManager.setPlayingState(audioModuleName, false)
  })
}

MultiMedia.prototype.reset = function () {
  try {
    for (var index in this.handle) {
      this.handle[index].stop()
    }
    AudioManager.setPlayingState(audioModuleName, false)
  } catch (error) {
    logger.error('error when try to stop all player', error.stack)
  }
  this.handle = {}
}

module.exports = MultiMedia
