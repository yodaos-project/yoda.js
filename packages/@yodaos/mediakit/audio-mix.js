var audioMixLogger = require('logger')('audioMix')
var AudioManager = require('@yoda/audio').AudioManager
var GlobalConfig = {
  scale: 0.3
}

try {
  GlobalConfig = require('/etc/yoda/system-config.json')
} catch (error) {
  audioMixLogger.warn(`require global-config.json error, use default. error: ${error}`)
}

class AudioMix {
  constructor (mediaClient, logger) {
    this.mediaClient = mediaClient
    this.preVolume = -1
    this.isMix = false

    if (logger) {
      this.logger = logger
    } else {
      this.logger = audioMixLogger
    }
  }

  /**
   * begin tts mix with audio.
   *
   * @function begin
   * @param {interrupt} [interrupt] interrupt audio if true, otherwise suppress audio. Undefined will use system config.
   * @param {playerId} [number] playerId is required if the value of interrupt is false.
   * @returns {Promise} Promise of audio mixed
   */
  begin (interrupt, playerId) {
    if (this.isMix) {
      return
    }
    // case: mixTtsBegin()
    if (interrupt === undefined) {
      playerId = -1
    }
    // case: mixTtsBegin(playerId)
    if (typeof interrupt === 'number') {
      playerId = interrupt
      interrupt = undefined
    }
    // case: mixTtsBegin(interrupt)
    if (playerId === undefined) {
      playerId = -1
    }

    var audioMixType = GlobalConfig.audioMixType || 'suppress'
    if (interrupt === true) {
      audioMixType = 'interrupt'
    }
    if (interrupt === false) {
      audioMixType = 'suppress'
    }

    this.isMix = true

    var deferred

    switch (audioMixType) {
      case 'suppress':
        deferred = this.suppress()
        break
      case 'interrupt':
        deferred = this.interrupt(playerId)
        break
      default:
        deferred = this.suppress()
    }
    return deferred
  }

  /**
   * end audio mix.
   *
   * @function end
   * @returns {Promise} Promise of audio mix end
   */
  end () {
    if (!this.isMix) {
      return
    }
    // resume volume
    if (this.preVolume !== -1) {
      AudioManager.setVolume(AudioManager.STREAM_PLAYBACK, this.preVolume)
      this.preVolume = -1
    }
    this.isMix = false
    this.logger.log('mix end')
  }

  suppress () {
    this.logger.log('beginMix with type: suppress')
    var scale = GlobalConfig.scale || 0.3
    this.preVolume = AudioManager.getVolume(AudioManager.STREAM_AUDIO)
    AudioManager.setVolume(AudioManager.STREAM_PLAYBACK, parseInt(this.preVolume * scale))
    return Promise.resolve()
  }

  interrupt (playerId) {
    this.logger.log('beginMix with type: interrupt')
    return this.mediaClient.pause(playerId)
  }
}

module.exports = AudioMix
