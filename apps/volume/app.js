'use strict'
var AudioManager = require('@yoda/audio').AudioManager
var logger = require('logger')('@volume')

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
      return JSON.parse(slots.num1.value)
    } catch (err) {
      return speakAndExit(STRING_COMMON_ERROR)
    }
  }

  function getVolume () {
    return parseInt(AudioManager.getVolume() / 10)
  }

  function setVolume (value) {
    var vol = parseInt(value.number)
    logger.info(`trying to set volume to ${vol}`)
    if (vol < 0 || vol > 10) {
      return speakAndExit(STRING_RANGE_ERROR)
    } else {
      var target = vol * 10
      AudioManager.setVolume(target)
      return activity.light.play('system://setVolume', {
        volume: target
      })
    }
  }

  function incVolume (value) {
    var vol = getVolume() + parseInt(value.number)
    return setVolume({ number: vol })
  }

  function decVolume (value) {
    var vol = getVolume() - parseInt(value.number)
    return setVolume({ number: vol })
  }

  function setMute () {
    AudioManager.setMute(true)
  }

  function setUnmute () {
    AudioManager.setMute(false)
  }

  activity.on('onrequest', function (nlp, action) {
    switch (nlp.intent) {
      case 'showvolume':
        if (AudioManager.isMuted()) {
          speakAndExit(STRING_SHOW_MUTED)
        } else {
          speakAndExit(STRING_SHOW_VOLUME + getVolume())
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
        incVolume({ number: 1 })
        break
      case 'volumedown':
      case 'volume_too_high':
        decVolume({ number: 1 })
        break
      case 'volumemin':
        setVolume({ number: 1 })
        break
      case 'volumemax':
        setVolume({ number: 10 })
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
      default:
        activity.exit()
        break
    }
  })
}
