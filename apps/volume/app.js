'use strict'
var AudioManager = require('@yoda/audio').AudioManager
var manifest = require('@yoda/manifest')
var logger = require('logger')('@volume')
var _ = require('@yoda/util')._
var ContextManager = require('@yodaos/application/context-manager')

module.exports = function (activity) {
  var STRING_COMMON_ERROR = '我没有听清，请重新对我说一次'
  var STRING_OUT_OF_RANGE_MAX = '已经是最大的音量了'
  var STRING_OUT_OF_RANGE = '音量调节超出范围'
  var STRING_SHOW_VOLUME = '当前音量为百分之'
  var STRING_SHOW_MUTED = '设备静音了，已帮你调回到百分之'
  var STRING_VOLUME_ALTERED = '音量百分之'
  var STRING_VOLUME_ADJUST_HELP = '音量百分之%d，如果想快速调节，你可以直接对我说，音量调到百分之%d'

  var mutedBy
  var defaultVolume = manifest.getDefaultValue('audio.volume.recover')
  if (typeof defaultVolume !== 'number' || isNaN(defaultVolume)) {
    defaultVolume = 30
  }

  function speakAndExit (ctx, text) {
    var ismuted = AudioManager.isMuted()
    if (ismuted) {
      AudioManager.setMute(false)
    }
    return activity.tts.speak(text).then(() => {
      if (ismuted) { AudioManager.setMute(true) }
      return ctx.exit()
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
   * @param {number} targetValue
   * @param {object} [options]
   * @param {'announce' | 'effect'} [options.type]
   * @returns {Promise<number>}
   */
  function setVolume (targetValue, options) {
    var type = _.get(options, 'type')
    var action = _.get(options, 'action')

    logger.info(`trying to set volume to ${targetValue}`)
    /**
     * Try reconfigure and set volume
     */
    var normalizedValue = targetValue
    if (normalizedValue < 0) {
      normalizedValue = 0
    } else if (normalizedValue > 100) {
      normalizedValue = 100
    }
    normalizedValue = Math.round(normalizedValue)
    logger.info(`set volume to normalized ${normalizedValue}`)

    if (AudioManager.isMuted() && normalizedValue > 0) {
      /** if device is already muted, unmute it. */
      setUnmute({ recover: false })
    }

    if (normalizedValue <= 0) {
      /** handles out of range conditions */
      setMute({ source: 'indirect' })
    }

    var prevVolume = getVolume()
    AudioManager.setVolume(normalizedValue)

    var promises = []

    if (type === 'effect' || type === 'announce') {
      promises.push(activity.light.play('system://setVolume.js', {
        volume: normalizedValue,
        action: action || (normalizedValue <= prevVolume ? 'decrease' : 'increase')
      }))
    }
    if (type === 'announce' && !AudioManager.isMuted()) {
      promises.push(activity.tts.speak(STRING_VOLUME_ALTERED + normalizedValue))
    }
    promises.push(activity.wormhole.updateVolume())
    return Promise.all(promises).then(() => normalizedValue)
  }

  /**
   *
   * @param {number} value
   * @param {object} [options]
   * @param {'announce' | 'effect'} [options.type]
   * @returns {Promise<number>}
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
   * @returns {Promise<number>}
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

  var fastMuteTimer
  function decVolumeWithFastMuteTimer (value, options) {
    var timeout = _.get(options, 'timeout', 2000)
    logger.debug('set timer', timeout)
    fastMuteTimer = setTimeout(() => {
      logger.debug('timer trigger')
      decVolume(/** set volume to 0 */100, options)
    }, timeout)
    decVolume(value, options)
  }

  function resetFastMuteTimer () {
    clearTimeout(fastMuteTimer)
  }

  var oneMinute = 60 * 1000
  var slowlyAdjustTimestamp = 0
  var slowlyAdjustCounter = 0
  function adjustVolumeSlowly (partition, options) {
    var shouldAnnounceHelp = false
    var couldAnnounce = options.type === 'announce'
    if ((Date.now() - slowlyAdjustTimestamp) < oneMinute) {
      ++slowlyAdjustCounter
      if (slowlyAdjustCounter === 3) {
        shouldAnnounceHelp = true
      }
    } else {
      slowlyAdjustTimestamp = Date.now()
      slowlyAdjustCounter = 1
    }

    var future
    var overrideOpt = {}
    if (shouldAnnounceHelp && couldAnnounce) {
      overrideOpt.type = 'effect'
    }
    if (partition > 0) {
      future = incVolume(100 / partition, Object.assign({}, options, overrideOpt))
    } else {
      future = decVolume(100 / -partition, Object.assign({}, options, overrideOpt))
    }
    return future.then(newVolume => {
      if (!shouldAnnounceHelp || !couldAnnounce) {
        return
      }
      return activity.tts.speak(STRING_VOLUME_ADJUST_HELP.replace(/%d/g, newVolume))
    })
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
      def = getVolume()
    }
    if (!def) {
      def = defaultVolume
    }
    return setVolume(def, options)
  }

  function handleWrap (fn) {
    return function (ctx) {
      try {
        return fn.apply(this, arguments)
      } catch (err) {
        if (err.tts) {
          return speakAndExit(ctx, err.tts)
        }
        logger.error('Unexpected error on volume app', err.stack)
        return speakAndExit(ctx, STRING_COMMON_ERROR)
      }
    }
  }

  var ctxManager = new ContextManager(activity)
  ctxManager.on('request', handleWrap(function (ctx) {
    var nlp = ctx.nlp
    var partition = 10
    var vol
    switch (nlp.intent) {
      case 'showvolume':
        if (AudioManager.isMuted() || getVolume() <= 0) {
          setUnmute({ type: /** do not announce nor effect */null })
            .then(() => speakAndExit(ctx, STRING_SHOW_MUTED + Math.ceil(getVolume())))
        } else {
          speakAndExit(ctx, STRING_SHOW_VOLUME + Math.ceil(getVolume()))
        }
        break
      case 'set_volume_percent': {
        vol = format(nlp.slots)
        if (vol < 0 || vol > 100) {
          return speakAndExit(ctx, STRING_OUT_OF_RANGE)
        }
        setVolume(vol, { type: 'announce' })
          .then(() => ctx.exit())
        break
      }
      case 'set_volume': {
        vol = format(nlp.slots)
        if (vol < 10) {
          vol = vol * partition
        }
        if (vol < 0 || vol > 100) {
          return speakAndExit(ctx, STRING_OUT_OF_RANGE)
        }
        setVolume(vol, { type: 'announce' })
          .then(() => ctx.exit())
        break
      }
      case 'add_volume_num':
        vol = format(nlp.slots)
        if (vol < 10) {
          vol = vol * partition
        }
        incVolume(vol, { type: 'announce' })
          .then(() => ctx.exit())
        break
      case 'dec_volume_num':
        vol = format(nlp.slots)
        if (vol < 10) {
          vol = vol * partition
        }
        decVolume(vol, { type: 'announce' })
          .then(() => ctx.exit())
        break
      case 'add_volume_percent':
        incVolume(format(nlp.slots), { type: 'announce' })
          .then(() => ctx.exit())
        break
      case 'dec_volume_percent':
        decVolume(format(nlp.slots), { type: 'announce' })
          .then(() => ctx.exit())
        break
      case 'volumeup':
      case 'volume_too_low':
        adjustVolumeSlowly(partition, { type: 'announce' })
          .then(() => ctx.exit())
        break
      case 'volumedown':
      case 'volume_too_high':
        adjustVolumeSlowly(-partition, { type: 'announce' })
          .then(() => ctx.exit())
        break
      case 'volumemin':
        setVolume(10, { type: 'announce' })
          .then(() => ctx.exit())
        break
      case 'volumemax': {
        vol = getVolume()
        if (vol >= 100) {
          return activity.tts.speak(STRING_OUT_OF_RANGE_MAX)
        }
        setVolume(100, { type: 'announce' })
          .then(() => ctx.exit())
        break
      }
      case 'volumemute':
        setMute()
          .then(() => ctx.exit())
        break
      case 'cancelmute':
        setUnmute({ type: 'announce' })
          .then(() => ctx.exit())
        break
      default:
        ctx.exit()
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
      case '/volume_down_with_fast_mute': {
        var timeout = parseInt(_.get(url.query, 'timeout', 2000))
        decVolumeWithFastMuteTimer(100 / partition, { type: 'effect', timeout: timeout })
        break
      }
      case '/volume_down_fast_mute_reset':
        resetFastMuteTimer()
        break
      case '/set_volume': {
        var vol = parseInt(_.get(url.query, 'value'))
        logger.info('set volume by url', typeof vol, vol)
        if (isNaN(vol) || vol < 0 || vol > 100) {
          return
        }
        setVolume(vol, { type: null })
        break
      }
      case '/mute':
        setMute()
        break
      case '/unmute':
        setUnmute({ type: 'effect' })
        break
    }
  })
}
