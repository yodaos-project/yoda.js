'use strict'
var AudioManager = require('@yoda/audio').AudioManager
var logger = require('logger')('@volume')
var _ = require('@yoda/util')._
var property = require('@yoda/property')

module.exports = function (activity) {
  var STRING_COMMON_ERROR = '我没有听清，请重新对我说一次'
  var STRING_RANGE_ERROR = '音量调节范围为0到10'
  var STRING_SHOW_VOLUME = '当前音量为'
  var STRING_SHOW_MUTED = '设备已静音'

  var mutedBy
  var volume = 60
  var defaultVolume = 30
  var volumeDefaultPropKey = 'persist.yoda.volume.default.value'

  function speakAndExit (text) {
    var ismuted = AudioManager.isMuted()
    if (ismuted) {
      AudioManager.setMute(false)
    }
    return activity.tts.speak(text).then(() => {
      if (ismuted) { AudioManager.setMute(true) }
      activity.exit()
    })
  }

  function format (slots) {
    try {
      return parseInt(_.get(JSON.parse(slots.num1.value), 'number', 0))
    } catch (err) {
      return speakAndExit(STRING_COMMON_ERROR)
    }
  }

  function getVolume () {
    /** FIXME: only volume on channel STREAM_TTS could be fetched right now */
    return Math.floor(AudioManager.getVolume(AudioManager.STREAM_TTS))
  }

  /**
   *
   * @param {number} vol
   * @param {object} [options]
   * @param {boolean} [options.silent]
   * @param {boolean} [options.init]
   */
  function setVolume (vol, options) {
    var silent = _.get(options, 'silent', false)
    var init = _.get(options, 'init', false)

    logger.info(`trying to set volume to ${vol}`)
    if (vol > 0 && vol <= 100) {
      if (AudioManager.isMuted()) {
        setUnmute({ recover: false })
      }

      /** normal range, set volume as it is */
      AudioManager.setVolume(vol)
      volume = vol
      if (init) {
        return
      }
      return activity.light.play('system://setVolume', {
        volume: vol,
        action: _.get(options, 'action')
      }).then(() => {
        return activity.exit()
      })
    }

    /** handles out of range conditions */
    if (vol <= 0) {
      setMute({ source: 'indirect' })
    }

    if (silent) {
      return activity.light.play('system://setVolume', {
        volume: vol,
        action: options.action || ''
      }).then(() => {
        return activity.exit()
      })
    }
    return speakAndExit(STRING_RANGE_ERROR)
  }

  /**
   *
   * @param {number} value
   * @param {object} [options]
   * @param {boolean} [options.silent]
   */
  function incVolume (value, options) {
    var vol = getVolume() + value
    options = Object.assign({}, options, { action: 'increase' })
    return setVolume(vol, options)
  }

  function decVolume (value, options) {
    var vol = getVolume() - value
    if (vol < 0) {
      vol = 0
    }
    options = Object.assign({}, options, { action: 'decrease' })
    return setVolume(vol, options)
  }

  function initVolume () {
    var volume = parseInt(property.get(volumeDefaultPropKey))
    if (!volume) {
      volume = 60
    }
    setVolume(volume, { init: true })
    setUnmute({ recover: false })
  }

  /**
   *
   * @param {object} [options]
   * @param {'direct' | 'indirect'} [options.source]
   */
  function setMute (options) {
    var source = _.get(options, 'source', 'direct')
    mutedBy = source

    logger.info('mute')
    AudioManager.setMute(true)
    if (volume == null) {
      volume = getVolume()
    }
    if (volume < 0) {
      volume = defaultVolume
    }
  }

  function setUnmute (options) {
    var recover = _.get(options, 'recover', true)
    logger.info('unmute')

    AudioManager.setMute(false)

    if (!recover) {
      return
    }
    var def
    if (mutedBy === 'direct') {
      def = volume
    } else {
      def = parseInt(property.get(volumeDefaultPropKey))
    }
    if (!def) {
      def = defaultVolume
    }
    setVolume(def)
  }

  function micMute (muted) {
    /** Only light effects, actual mic mute operation has been handled by runtime */
    return activity.light.play('system://setMuted', {
      muted: muted
    }).then(() => {
      return activity.exit()
    })
  }

  activity.on('request', function (nlp, action) {
    var silent = _.get(nlp, 'silent')
    var partition = _.get(nlp, 'partition', 10)
    switch (nlp.intent) {
      case 'showvolume':
        if (AudioManager.isMuted()) {
          speakAndExit(STRING_SHOW_MUTED)
        } else {
          speakAndExit(STRING_SHOW_VOLUME + Math.floor(getVolume() / partition))
        }
        break
      case 'set_volume_percent':
        speakAndExit(STRING_RANGE_ERROR)
        break
      case 'set_volume':
        setVolume(format(nlp.slots) * partition)
        break
      case 'add_volume_num':
        incVolume(format(nlp.slots) * partition)
        break
      case 'dec_volume_num':
        decVolume(format(nlp.slots) * partition)
        break
      case 'volumeup':
      case 'volume_too_low':
        incVolume(100 / partition, { silent: silent })
        break
      case 'volumedown':
      case 'volume_too_high':
        decVolume(100 / partition, { silent: silent })
        break
      case 'volumemin':
        setVolume(10)
        break
      case 'volumemax':
        setVolume(100)
        break
      case 'volumemute':
        setMute()
        activity.exit()
        break
      case 'cancelmute':
        setUnmute()
        activity.exit()
        break
      case 'mic_mute':
        micMute(true)
        break
      case 'mic_unmute':
        micMute(false)
        break
      case 'init_volume':
        initVolume()
        activity.exit()
        break
      default:
        activity.exit()
        break
    }
  })
}
