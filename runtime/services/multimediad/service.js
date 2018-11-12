'use strict'

var EventEmitter = require('events').EventEmitter
var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var inherits = require('util').inherits
var logger = require('logger')('multimediaService')
var audioModuleName = 'multimedia'
AudioManager.setPlayingState(audioModuleName, false)

function MultiMedia (lightd) {
  EventEmitter.call(this)
  this.handle = {}
  this.pausedAppIdOnAwaken = null
  this.lightd = lightd
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

/**
 * @param {string} appId
 * @param {string} url
 * @param {string} streamType
 * @returns {Multimedia.Player}
 */
MultiMedia.prototype.prepare = function prepare (appId, url, streamType) {
  if (this.handle[appId]) {
    try {
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
  this.handle[appId] = player
  player.prepare(url)
  return player
}

MultiMedia.prototype.start = function (appId, url, streamType) {
  var player = this.prepare(appId, url, streamType)
  player.once('prepared', () => player.start())
  return player.id
}

MultiMedia.prototype.stop = function (appId) {
  if (this.handle[appId]) {
    try {
      this.handle[appId].stop()
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
    var handle = this.handle[appId]
    if (handle) {
      try {
        handle.stop()
        delete this.handle[appId]
      } catch (error) {
        logger.error(`try to stop player error with appId: ${appId}`, error.stack)
      }
    }
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
  player.on('cancel', () => {
    this.emit('cancel', '' + player.id)
    AudioManager.setPlayingState(audioModuleName, false)
  })
  player.on('error', () => {
    // free handle when something goes wrong
    var handle = this.handle[appId]
    if (handle) {
      try {
        handle.stop()
        delete this.handle[appId]
      } catch (error) {
        logger.error(`try to stop player error with appId: ${appId}`, error.stack)
      }
    }
    this.emit('error', '' + player.id)
    AudioManager.setPlayingState(audioModuleName, false)
  })

  player.on('blockpausemode', enabled => {
    if (!enabled) {
      this.lightd.invoke('stopNetworkLagSound', [])
      clearTimeout(player.__blockpausemodeTimer)
      return
    }
    logger.info('media cache blocked, waiting announcement timer.')

    player.__blockpausemodeTimer = setTimeout(() => {
      if (!player.playing) {
        logger.warn('player is not playing, skipping stage 1 announcement.')
        return
      }
      logger.info('media cache blocked, playing stage 1 announcement')

      this.lightd.invoke('networkLagSound', ['/opt/media/network_lag_common.ogg'])
        .then(() => {
          logger.info('media cache blocked, stage 1 result', player.blockpausemodeEnabled)
          if (!player.blockpausemodeEnabled) return

          player.__blockpausemodeTimer = setTimeout(() => {
            if (!player.playing) {
              logger.warn('player is not playing, skipping stage 2 announcement.')
              return
            }
            logger.info('media cache blocked, playing stage 2 announcement')

            this.lightd.invoke('networkLagSound', [
              '/opt/media/network_lag_media_stage_2.ogg',
              /** dbus bug */'true'
            ])
          }, 7000) /** stage 2 timer */
        })
    }, 5000) /** stage 1 timer */
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
