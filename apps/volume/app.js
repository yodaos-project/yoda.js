'use strict'
var AudioManager = require('@yoda/audio').AudioManager
var logger = require('logger')('@volume')
var _ = require('@yoda/util')._

module.exports = function (activity) {
  var STRING_COMMON_ERROR = '我没有听清，请重新对我说一次'
  var STRING_OUT_OF_RANGE_MAX = '已经是最大的音量了'
  var STRING_OUT_OF_RANGE = '音量调节超出范围'
  var STRING_SHOW_VOLUME = '当前音量为百分之'
  var STRING_SHOW_MUTED = '设备已静音，已帮你调回到百分之'
  var STRING_VOLUME_ALTERED = '音量已调到百分之'

  var mutedBy
  var volume = 60
  var defaultVolume = 30

  function speakAndExit (text) {
    var ismuted = AudioManager.isMuted()
    if (ismuted) {
      AudioManager.setMute(false)
    }
    return activity.tts.speak(text).then(() => {
      if (ismuted) { AudioManager.setMute(true) }
      return activity.exit()
    })
  }

  function format (slots) {
    var val = parseFloat(_.get(JSON.parse(slots.num1.value), 'number', 0))
    if (isNaN(val)) {
      throw new Error('Unexpected error on parse nlp slots')
    }
    return val
  }

  function getVolume () {
    /** FIXME: only volume on channel STREAM_TTS could be fetched right now */
    return Math.floor(AudioManager.getVolume(AudioManager.STREAM_TTS))
  }

  /**
   * By default setVolume doesn't announce nor play effects.
   *
   * @param {number} vol
   * @param {object} [options]
   * @param {'announce' | 'effect'} [options.type]
   */
  function setVolume (vol, options) {
    var type = _.get(options, 'type')
    var action = _.get(options, 'action')

    logger.info(`trying to set volume to ${vol}`)
    /**
     * Try reconfigure and set volume
     */
    var localVol = vol
    if (localVol < 0) {
      localVol = 0
    } else if (localVol > 100) {
      localVol = 100
    }
    if (localVol % 1 >= 0.5) {
      localVol = Math.ceil(localVol)
    } else {
      localVol = Math.floor(localVol)
    }

    if (AudioManager.isMuted() && localVol > 0) {
      /** if device is already muted, unmute it. */
      setUnmute({ recover: false })
    }

    if (vol === 0) {
      /** handles out of range conditions */
      setMute({ source: 'indirect' })
    }

    var prevVolume = getVolume()
    AudioManager.setVolume(localVol)
    volume = localVol

    var promises = []

    if (type === 'effect' || type === 'announce') {
      promises.push(activity.light.play('system://setVolume.js', {
        volume: localVol,
        action: action || (localVol <= prevVolume ? 'decrease' : 'increase')
      }))
    }
    if (type === 'announce') {
      promises.push(activity.tts.speak(STRING_VOLUME_ALTERED + localVol))
    }
    return Promise.all(promises)
  }

  /**
   *
   * @param {number} value
   * @param {object} [options]
   * @param {'announce' | 'effect'} [options.type]
   */
  function incVolume (value, options) {
    var type = _.get(options, 'type')
    var vol = getVolume()
    if (vol >= 100 && type === 'announce') {
      return activity.tts.speak(STRING_OUT_OF_RANGE_MAX)
    }
    vol += value
    options = Object.assign({}, options, { action: 'increase' })
    return setVolume(vol, options)
  }

  /**
   *
   * @param {number} value
   * @param {object} [options]
   * @param {'announce' | 'effect'} [options.type]
   */
  function decVolume (value, options) {
    var type = _.get(options, 'type')
    var vol = getVolume()
    if (vol <= 0 && type === 'announce') {
      return activity.tts.speak(STRING_OUT_OF_RANGE)
    }
    vol -= value
    options = Object.assign({}, options, { action: 'decrease' })
    return setVolume(vol, options)
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
    return Promise.resolve()
  }

  /**
   *
   * @param {object} [options]
   * @param {boolean} [options.recover]
   * @param {'announce' | 'effect'} [options.type]
   */
  function setUnmute (options) {
    var recover = _.get(options, 'recover', true)
    logger.info('unmute')

    AudioManager.setMute(false)

    if (!recover) {
      return Promise.resolve()
    }
    var def
    if (mutedBy === 'direct') {
      def = volume
    }
    if (!def) {
      def = defaultVolume
    }
    return setVolume(def, options)
  }

  function handleWrap (fn) {
    return function () {
      try {
        return fn.apply(this, arguments)
      } catch (err) {
        if (err.tts) {
          return speakAndExit(err.tts)
        }
        logger.error('Unexpected error on volume app', err.stack)
        return speakAndExit(STRING_COMMON_ERROR)
      }
    }
  }

  activity.on('request', handleWrap(function (nlp, action) {
    var partition = 10
    var vol
    switch (nlp.intent) {
      case 'showvolume':
        if (AudioManager.isMuted()) {
          setUnmute({ type: /** do not announce nor effect */null })
            .then(() => speakAndExit(STRING_SHOW_MUTED + Math.ceil(getVolume())))
        } else {
          speakAndExit(STRING_SHOW_VOLUME + Math.ceil(getVolume()))
        }
        break
      case 'set_volume_percent': {
        vol = format(nlp.slots)
        if (vol < 0 || vol > 100) {
          return speakAndExit(STRING_OUT_OF_RANGE)
        }
        setVolume(vol, { type: 'announce' })
          .then(() => activity.exit())
        break
      }
      case 'set_volume': {
        vol = format(nlp.slots)
        if (vol < 10) {
          vol = vol * partition
        }
        if (vol < 0 || vol > 100) {
          return speakAndExit(STRING_OUT_OF_RANGE)
        }
        setVolume(vol, { type: 'announce' })
          .then(() => activity.exit())
        break
      }
      case 'add_volume_num':
        incVolume(format(nlp.slots) * partition, { type: 'announce' })
          .then(() => activity.exit())
        break
      case 'dec_volume_num':
        decVolume(format(nlp.slots) * partition, { type: 'announce' })
          .then(() => activity.exit())
        break
      case 'add_volume_percent':
        incVolume(format(nlp.slots), { type: 'announce' })
          .then(() => activity.exit())
        break
      case 'dec_volume_percent':
        decVolume(format(nlp.slots), { type: 'announce' })
          .then(() => activity.exit())
        break
      case 'volumeup':
      case 'volume_too_low':
        incVolume(100 / partition, { type: 'announce' })
          .then(() => activity.exit())
        break
      case 'volumedown':
      case 'volume_too_high':
        decVolume(100 / partition, { type: 'announce' })
          .then(() => activity.exit())
        break
      case 'volumemin':
        setVolume(10, { type: 'announce' })
          .then(() => activity.exit())
        break
      case 'volumemax':
        setVolume(100, { type: 'announce' })
          .then(() => activity.exit())
        break
      case 'volumemute':
        setMute()
          .then(() => activity.exit())
        break
      case 'cancelmute':
        setUnmute({ type: 'announce' })
          .then(() => activity.exit())
        break
      default:
        activity.exit()
        break
    }
  }))

  activity.on('url', url => {
    var partition = parseInt(_.get(url.query, 'partition', 10))
    switch (url.pathname) {
      case '/volume_up':
        incVolume(100 / partition, { type: 'effect' })
        break
      case '/volume_down':
        decVolume(100 / partition, { type: 'effect' })
        break
    }
  })
}
