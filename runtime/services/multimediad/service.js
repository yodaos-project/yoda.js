'use strict'

var EventEmitter = require('events').EventEmitter
var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var inherits = require('util').inherits
var logger = require('logger')('multimediaService')
var Manager = require('./manager')

var audioModuleName = 'multimedia'
AudioManager.setPlayingState(audioModuleName, false)

function MultiMedia (lightd) {
  EventEmitter.call(this)
  this.handle = {}
  this.playerManager = new Manager()
  this.pausedAppIdOnAwaken = null
  this.lightd = lightd
}
inherits(MultiMedia, EventEmitter)

MultiMedia.prototype.getCurrentlyPlayingAppId = function getCurrentlyPlayingAppId () {
  return this.playerManager.getCurrentlyPlayingAppId()
}

/**
 * @param {string} appId
 * @param {string} url
 * @param {string} streamType
 * @returns {Multimedia.Player}
 */
MultiMedia.prototype.prepare = function prepare (appId, url, streamType, options) {
  var player
  if (options && options.multiple !== true) {
    this.playerManager.deleteAllByAppId(appId)
  }
  if (streamType === 'alarm') {
    player = new MediaPlayer(AudioManager.STREAM_ALARM)
  } else {
    player = new MediaPlayer(AudioManager.STREAM_PLAYBACK)
  }
  this.listenEvent(player, appId)
  this.playerManager.appendByAppId(appId, player)
  player.prepare(url)
  return player
}

MultiMedia.prototype.start = function (appId, url, streamType, options) {
  var player = this.prepare(appId, url, streamType, options)
  player.once('prepared', () => player.start())
  return player.id
}

MultiMedia.prototype.stop = function (appId, playerId) {
  var handle = []
  if (playerId > -1) {
    handle = this.playerManager.find(appId, playerId)
  } else {
    handle = this.playerManager.find(appId)
  }
  if (handle.length > 0) {
    for (var i = 0; i < handle.length; i++) {
      try {
        handle[i].stop()
      } catch (error) {
        logger.error('try to stop player errer with appId: ', appId, error.stack)
      }
      this.playerManager.deleteByAppId(appId, handle[i].id)
    }
  }
}

MultiMedia.prototype.pause = function (appId, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.log(`[404] handle not found for appId(${appId}) playerId(${playerId})`)
    return true
  }

  if (handle.length > 1 && +playerId > -1) {
    logger.log(`[400] multiple handle for appId(${appId}) playerId(${playerId})`)
    return false
  }

  var ret = 0
  handle.forEach((player) => {
    var playing = false
    try {
      playing = player.playing
    } catch (error) {
      logger.error('try to get playing state of player error with appId: ', appId, error.stack)
    }

    try {
      player.pause()
      ret++
      AudioManager.setPlayingState(audioModuleName, false)

      // need to send events only when the state is switched
      if (playing === true) {
        process.nextTick(() => {
          player.emit('paused')
        })
      }
    } catch (error) {
      logger.error('try to pause player error with appId: ', appId, error.stack)
    }
  })

  return ret === handle.length
}

MultiMedia.prototype.resume = function (appId, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.log(`[404] handle not found`)
    return true
  }

  if (handle.length > 1 && +playerId > -1) {
    logger.log(`[400] multiple handle for appId(${appId}) playerId(${playerId})`)
    return false
  }

  handle.forEach((player) => {
    try {
      if (!player.playing) {
        player.resume()
        logger.log(`[200] handle.resume(${player.id}) success`)
        AudioManager.setPlayingState(audioModuleName, true)

        // need to send events only when the state is switched
        process.nextTick(() => {
          player.emit('resumed')
        })
      }
    } catch (error) {
      logger.error('try to resume player errer with appId: ', appId, error.stack)
    }
  })
  return true
}

MultiMedia.prototype.getPosition = function (appId, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.error(`[404] handle not found`)
    return -1
  }

  if (handle.length !== 1) {
    return -1
  }

  return handle[0].position
}

MultiMedia.prototype.getDuration = function (appId, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.error(`[404] handle not found`)
    return -1
  }

  if (handle.length !== 1) {
    return -1
  }

  return handle[0].duration
}

MultiMedia.prototype.getLoopMode = function (appId, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.error(`[404] handle not found`)
    return false
  }

  if (handle.length !== 1) {
    return false
  }

  return this.handle[appId].loopMode
}

MultiMedia.prototype.setLoopMode = function (appId, mode, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.error(`[404] handle not found`)
    return false
  }

  if (handle.length !== 1) {
    return false
  }

  handle[0].loopMode = mode === 'true'
}

MultiMedia.prototype.getEqMode = function getEqMode (appId, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.error(`[404] handle not found`)
    return -1
  }

  if (handle.length !== 1) {
    logger.info(`multiple handle for app ${appId}, returning default eq mode`)
    return -1
  }

  return handle[0].eqMode
}

MultiMedia.prototype.setEqMode = function setEqMode (appId, mode, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.error(`[404] handle not found`)
    return -1
  }

  if (handle.length !== 1) {
    logger.info(`multiple handle for app ${appId}, playerId is required`)
    return -1
  }

  handle[0].eqMode = mode
}

MultiMedia.prototype.seek = function (appId, position, playerId, callback) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.error(`[404] handle not found`)
    return callback(new Error('handle not found'))
  }

  if (handle.length !== 1) {
    logger.info(`multiple handle for app ${appId}, playerId is required`)
    return callback(new Error('playerId is required'))
  }

  try {
    handle[0].seek(position, callback)
  } catch (error) {
    logger.error('try to seek player errer with appId: ', appId, error.stack)
    return callback(new Error('player error'))
  }
  callback()
}

MultiMedia.prototype.setSpeed = function (appId, speed, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    logger.error(`[404] handle not found`)
    return false
  }

  if (handle.length !== 1) {
    logger.info(`multiple handle for app ${appId}, playerId is required`)
    return false
  }

  try {
    handle[0].setSpeed(speed)
    process.nextTick(() => {
      handle[0].emit('speedchange')
    })
  } catch (error) {
    logger.error(`[500] try to setSpeed error with appId(${appId}) speed(${speed}) playerId(${playerId})`)
    return false
  }
  return true
}

MultiMedia.prototype.listenEvent = function (player, appId) {
  player.on('prepared', () => {
    this.emit('prepared', '' + player.id, player.duration, player.position)
    AudioManager.setPlayingState(audioModuleName, true)
  })
  player.on('playbackcomplete', () => {
    // free handle after playbackcomplete
    try {
      player.stop()
    } catch (error) {
      logger.error(`try to stop player error with appId: ${appId}`, error.stack)
    }
    this.playerManager.deleteByAppId(appId, player.id)
    this.emit('playbackcomplete', '' + player.id, player.duration, player.position)
    AudioManager.setPlayingState(audioModuleName, false)
  })
  player.on('bufferingupdate', () => {
    this.emit('bufferingupdate', '' + player.id, player.duration, player.position)
  })
  player.on('seekcomplete', () => {
    this.emit('seekcomplete', '' + player.id, player.duration, player.position)
    AudioManager.setPlayingState(audioModuleName, true)
  })
  player.on('cancel', () => {
    this.emit('cancel', '' + player.id, player.duration, player.position)
    AudioManager.setPlayingState(audioModuleName, false)
  })
  player.on('error', () => {
    // free handle when something goes wrong
    try {
      player.stop()
    } catch (error) {
      logger.error(`try to stop player error with appId: ${appId}`, error.stack)
    }

    this.playerManager.deleteByAppId(appId, player.id)
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

  player.on('paused', () => {
    AudioManager.setPlayingState(audioModuleName, false)
    this.emit('paused', '' + player.id, player.duration, player.position)
  })

  player.on('resumed', () => {
    AudioManager.setPlayingState(audioModuleName, true)
    this.emit('resumed', '' + player.id, player.duration, player.position)
  })

  player.on('speedchange', () => {
    this.emit('speedchange', '' + player.id, player.duration, player.position)
  })
}

MultiMedia.prototype.getState = function (appId, playerId) {
  var handle = this.playerManager.find(appId, playerId)

  if (handle.length === 0) {
    return 'IDLE'
  }

  var playing = handle[0].playing
  return playing ? 'PLAYING' : 'PAUSED'
}

MultiMedia.prototype.reset = function () {
  try {
    this.playerManager.reset()
    AudioManager.setPlayingState(audioModuleName, false)
  } catch (error) {
    logger.error('error when try to stop all player', error.stack)
  }
}

module.exports = MultiMedia
