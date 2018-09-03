'use strict'
var AudioManager = require('@yoda/audio').AudioManager
var logger = require('logger')('@volume')
var _ = require('@yoda/util')._

module.exports = function (activity) {
  var STRING_COMMON_ERROR = '我没有听清，请重新对我说一次'
  var STRING_RANGE_ERROR = '音量调节范围为0到10'
  var STRING_SHOW_VOLUME = '当前音量为'
  var STRING_SHOW_MUTED = '设备已静音'

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
      return _.get(JSON.parse(slots.num1.value), 'number', 0)
    } catch (err) {
      return speakAndExit(STRING_COMMON_ERROR)
    }
  }

  function getVolume () {
    /** FIXME: only volume on channel STREAM_TTS could be fetched right now */
    return AudioManager.getVolume(AudioManager.STREAM_TTS)
  }

  /**
   *
   * @param {number} vol
   * @param {object} [options]
   * @param {boolean} [options.silent]
   */
  function setVolume (vol, options) {
    var silent = _.get(options, 'silent', false)

    logger.info(`trying to set volume to ${vol}`)
    if (vol < 0 || vol > 100) {
      if (silent) {
        return activity.light.play('system://setVolume', {
          volume: vol
        })
      }
      return speakAndExit(STRING_RANGE_ERROR)
    } else {
      AudioManager.setVolume(vol)
      return activity.light.play('system://setVolume', {
        volume: vol
      })
    }
  }

  /**
   *
   * @param {number} value
   * @param {object} [options]
   * @param {boolean} [options.silent]
   */
  function incVolume (value, options) {
    var vol = getVolume() + value
    return setVolume(vol, options)
  }

  function decVolume (value, options) {
    var vol = getVolume() - value
    return setVolume(vol, options)
  }

  function setMute () {
    AudioManager.setMute(true)
  }

  function setUnmute () {
    AudioManager.setMute(false)
  }

  function micMute (muted) {
    /** Only light effects, actual mic mute operation has been handled by runtime */
    return activity.light.play('system://setMuted', {
      muted: muted
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
          speakAndExit(STRING_SHOW_VOLUME + getVolume() / partition)
        }
        break
      case 'set_volume_percent':
        speakAndExit(STRING_RANGE_ERROR)
        break
      case 'set_volume':
        setVolume(format(nlp.slots))
        break
      case 'add_volume_num':
        incVolume(format(nlp.slots))
        break
      case 'dec_volume_num':
        decVolume(format(nlp.slots))
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
        break
      case 'cancelmute':
        setUnmute()
        break
      case 'switchmute':
        if (AudioManager.isMuted()) {
          setUnmute()
        } else {
          setMute()
        }
        break
      case 'mic_mute':
        micMute(true)
        break
      case 'mic_unmute':
        micMute(false)
        break
      default:
        activity.exit()
        break
    }
  })
}
