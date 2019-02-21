var logger = require('logger')('audioMix')
var AudioManager = require('@yoda/audio').AudioManager
var GlobalConfig = {
  scale: 0.3
}

try {
  GlobalConfig = require('/etc/yoda/system-config.json')
} catch (error) {
  logger.warn(`require global-config.json error, use default. error: ${error}`)
}

class AudioMix {
  constructor (runtime) {
    this.runtime = runtime
    this.preVolume = -1
    this.isMix = false
  }

  mixTtsBegin (appId, interrupt, playerId) {
    if (this.isMix) {
      return
    }
    if (!appId) {
      return
    }
    var audioMixType = GlobalConfig.audioMixType || 'suppress'
    if (interrupt === true) {
      audioMixType = 'interrupt'
    }
    if (interrupt === false) {
      audioMixType = 'suppress'
    }
    this.preVolume = AudioManager.getVolume(AudioManager.STREAM_AUDIO)
    this.isMix = true

    var deferred
    var scale = GlobalConfig.scale || 0.3
    switch (audioMixType) {
      case 'suppress':
        deferred = this.suppress(parseInt(this.preVolume * scale))
        break
      case 'interrupt':
        deferred = this.interrupt(appId, playerId)
        break
      default:
        deferred = this.suppress(parseInt(this.preVolume * scale))
    }
    return deferred
  }

  mixTtsEnd () {
    if (!this.isMix) {
      return
    }
    // resume volume
    if (this.preVolume !== -1) {
      AudioManager.setVolume(AudioManager.STREAM_PLAYBACK, this.preVolume)
      this.preVolume = -1
    }
    this.isMix = false
    logger.log('mix end')
  }

  suppress (volume) {
    logger.log('beginMix with type: suppress')
    AudioManager.setVolume(AudioManager.STREAM_PLAYBACK, volume)
    return Promise.resolve()
  }

  interrupt (appId, playerId) {
    logger.log('beginMix with type: interrupt')
    return this.runtime.multimediaMethod('pause', [appId, playerId])
  }
}

module.exports = AudioMix
