'use strict'
var Application = require('@yodaos/application').Application
var AudioFocus = require('@yodaos/application').AudioFocus
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis
var AudioManager = require('@yoda/audio').AudioManager
var manifest = require('@yoda/manifest')
var logger = require('logger')('@volume')
var _ = require('@yoda/util')._
var strings = require('./strings.json')

var mutedBy
var defaultVolume = manifest.getDefaultValue('audio.volume.recover')
if (typeof defaultVolume !== 'number' || isNaN(defaultVolume)) {
  defaultVolume = 30
}

function volumeOutOfRange (vol) {
  return isNaN(vol) || vol < 0 || vol > 100
}

function getVolume () {
  /** FIXME: only volume on channel STREAM_TTS could be fetched right now */
  return Math.floor(AudioManager.getVolume(AudioManager.STREAM_TTS))
}

module.exports = function (api) {
  var speechSynthesis = new SpeechSynthesis(api)
  var effect = api.effect

  function speakAsync (text) {
    logger.info('speak text', text)
    return new Promise((resolve, reject) => {
      speechSynthesis.speak(text)
        .on('error', reject)
        .on('cancel', resolve)
        .on('end', resolve)
    })
  }

  function speakAndAbandonFocus (audioFocus, text) {
    var ismuted = AudioManager.isMuted()
    if (ismuted) {
      AudioManager.setMute(false)
    }
    return speakAsync(text).then(() => {
      return audioFocus.abandon()
    })
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
      promises.push(effect.play('system://setVolume.js', {
        volume: normalizedValue,
        action: action || (normalizedValue <= prevVolume ? 'decrease' : 'increase')
      }))
    }
    if (type === 'announce' && !AudioManager.isMuted()) {
      promises.push(speakAsync(strings.VOLUME_ALTERED + normalizedValue))
    }
    // promises.push(activity.wormhole.updateVolume())
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
      return speakAsync(strings.OUT_OF_RANGE_MAX)
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
      return speakAsync(strings.OUT_OF_RANGE)
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
      return speakAsync(strings.VOLUME_ADJUST_HELP.replace(/%d/g, newVolume))
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

  function voiceFeedback (focus, pathname, query) {
    var partition = 10
    var vol = parseInt(_.get(query, 'value'))
    switch (pathname) {
      case '/show_volume':
        if (AudioManager.isMuted() || getVolume() <= 0) {
          setUnmute({ type: /** do not announce nor effect */null })
            .then(() => speakAndAbandonFocus(focus, strings.SHOW_MUTED + Math.ceil(getVolume())))
        } else {
          speakAndAbandonFocus(focus, strings.SHOW_VOLUME + Math.ceil(getVolume()))
        }
        break
      case '/set_volume': {
        if (volumeOutOfRange(vol)) {
          speakAndAbandonFocus(focus, strings.OUT_OF_RANGE)
          break
        }
        setVolume(vol, { type: 'announce' })
          .then(() => focus.abandon())
        break
      }
      case '/add_volume':
        if (volumeOutOfRange(vol)) {
          speakAndAbandonFocus(focus, strings.OUT_OF_RANGE)
          break
        }
        incVolume(vol, { type: 'announce' })
          .then(() => focus.abandon())
        break
      case '/dec_volume':
        if (volumeOutOfRange(vol)) {
          speakAndAbandonFocus(focus, strings.OUT_OF_RANGE)
          break
        }
        decVolume(vol, { type: 'announce' })
          .then(() => focus.abandon())
        break
      case '/volume_up':
        adjustVolumeSlowly(partition, { type: 'announce' })
          .then(() => focus.abandon())
        break
      case '/volume_down':
        adjustVolumeSlowly(-partition, { type: 'announce' })
          .then(() => focus.abandon())
        break
      case '/volume_min':
        setVolume(10, { type: 'announce' })
          .then(() => focus.abandon())
        break
      case '/volume_max': {
        vol = getVolume()
        if (vol >= 100) {
          speakAndAbandonFocus(focus, strings.OUT_OF_RANGE_MAX)
          break
        }
        setVolume(100, { type: 'announce' })
          .then(() => focus.abandon())
        break
      }
      case '/volume_mute':
        setMute()
          .then(() => focus.abandon())
        break
      case '/volume_unmute':
        setUnmute({ type: 'announce' })
          .then(() => focus.abandon())
        break
      default:
        focus.abandon()
        break
    }
  }

  function effectFeedback (pathname, query) {
    var partition = parseInt(_.get(query, 'partition', 10))
    switch (pathname) {
      case '/volume_up':
        incVolume(100 / partition, { type: 'effect' })
        break
      case '/volume_down':
        decVolume(100 / partition, { type: 'effect' })
        break
      case '/volume_down_with_fast_mute': {
        var timeout = parseInt(_.get(query, 'timeout', 2000))
        decVolumeWithFastMuteTimer(100 / partition, { type: 'effect', timeout: timeout })
        break
      }
      case '/volume_down_fast_mute_reset':
        resetFastMuteTimer()
        break
      case '/set_volume': {
        var vol = parseInt(_.get(query, 'value'))
        logger.info('set volume by url', typeof vol, vol)
        if (isNaN(vol) || vol < 0 || vol > 100) {
          break
        }
        setVolume(vol, { type: null })
        break
      }
      case '/volume_mute':
        setMute()
        break
      case '/volume_unmute':
        setUnmute({ type: 'effect' })
        break
    }
  }

  var app = Application({
    url: function url (url) {
      if (_.startsWith(url.pathname, '/voice_feedback')) {
        var focus = new AudioFocus(AudioFocus.Type.TRANSIENT, api.audioFocus)
        focus.onGain = () => voiceFeedback(focus, url.pathname.replace('/voice_feedback', ''), url.query)
        focus.onLoss = () => speechSynthesis.cancel()
        focus.request()
        return
      }
      effectFeedback(url.pathname, url.query)
    }
  }, api)

  return app
}
