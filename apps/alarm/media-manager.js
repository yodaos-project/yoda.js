'use strict'

var AudioFocus = require('@yodaos/application').AudioFocus
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var AudioManager = require('@yoda/audio').AudioManager
var tts = require('@yodaos/speech-synthesis').speechSynthesis
var logger = require('logger')('alarm-MediaManager')

/**
 * @class MediaManager
 */
function MediaManager (alarmCore) {
  this.alarmCore = alarmCore
  this.audioFocus = new AudioFocus(AudioFocus.Type.TRANSIENT)
  this.audioFocus.player = new MediaPlayer(this.streamType || AudioManager.STREAM_ALARM)
  this.audioFocus.onGain = () => {
    this.alarmCore._preventEventsDefaults()
    this.audioFocus.isFocus = true
    this.audioFocus.resumeOnGain = false
    var player = this.audioFocus.player
    if (!player) {
      player = this.audioFocus.player = new MediaPlayer(this.streamType || AudioManager.STREAM_ALARM)
    }
    this.setListener(player)
    if (this.audioFocus.playUrl) {
      player.start(this.audioFocus.playUrl)
    }
  }
  this.audioFocus.onLoss = (transient, mayDuck) => {
    logger.info('audioFocus---->onLoss; transient: ', transient)
    logger.info('audioFocus---->onLoss; mayDuck: ', mayDuck)
    this.alarmCore.restoreEventsDefaults()
    this.audioFocus.isFocus = false
    var player = this.audioFocus.player
    if (!player) {
      return
    }
    this.stopMedia()
    this.audioFocus.playUrl = null
    this.alarmCore.clearAll()
  }
}

MediaManager.prototype.playAudio = function (url, option) {
  logger.info('playAudio------>url', url)
  logger.info('playAudio------>isFocus', this.audioFocus.isFocus)
  this.streamType = (option && option.streamType) || AudioManager.STREAM_ALARM
  this.loop = (option && option.loop) || false
  this.audioFocus.playUrl = url
  if (this.audioFocus.isFocus) {
    this.stopMedia()
    this.audioFocus.player.start(url)
    logger.info('playAudio------>start ', url)
  } else {
    this.audioFocus.request()
  }
  return Promise.resolve()
}

MediaManager.prototype.release = function () {
  if (this.audioFocus) {
    this.audioFocus.abandon()
  }
}

MediaManager.prototype.stopMedia = function stopMedia () {
  var player = this.audioFocus.player
  if (player) {
    player.stop()
    player.reset()
  }
  player = this.audioFocus.player = new MediaPlayer(this.streamType || AudioManager.STREAM_ALARM)
  this.setListener(player)
}

MediaManager.prototype.setListener = function setListener (player) {
  player.on('prepared', (id, duration, position) => {
    this.isPlaying = true
    logger.info(`player prepared----> id:${id}, duration:${duration}, position:${position}`)
  })
  player.on('start', () => {
    logger.info('player start----> is called')
  })
  player.on('seekcomplete', (id) => {
    logger.info(`player seekcomplete----> id:${id}`)
  })
  player.on('error', (id) => {
    this.isPlaying = false
    logger.info(`player error----> id:${id}`)
  })
  player.on('cancel', (id) => {
    this.isPlaying = false
    logger.info(`player cancel----> id:${id}`)
  })
  player.on('playbackcomplete', (id) => {
    this.isPlaying = false
    logger.info(`player playbackcomplete----> id:${id}`)
    if (this.loop) {
      this.stopMedia()
      this.audioFocus.player.start(this.audioFocus.playUrl)
    }
  })
  player.on('paused', (id) => {
    logger.info(`player paused----> id:${id}`)
  })
  player.on('resumed', (id) => {
    this.isPlaying = true
    logger.info(`player resumed----> id:${id}`)
  })
}

MediaManager.prototype.stopMediaAndTts = function stopMediaAndTts () {
  this.stopMedia()
  tts.cancel()
}

MediaManager.prototype.speakTts = function speakTts (content, callback) {
  var _callback = callback
  return new Promise((resolve, reject) => {
    if (!tts) {
      _callback('tts not inited')
    }
    tts.speak(content)
      .once('end', () => {
        _callback('end')
      })
      .once('cancel', () => {
        _callback('cancel')
      })
      .once('error', () => {
        _callback('error')
      })
  })
}

exports.MediaManager = MediaManager
