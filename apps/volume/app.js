'use strict'
var AudioManager = require('@yoda/audio').AudioManager
var logger = require('logger')('@volume')
var _ = require('@yoda/util')._

module.exports = function (activity) {
  var STRING_COMMON_ERROR = '我没有听清，请重新对我说一次'
  var STRING_RANGE_ERROR = '音量调节范围为0到10'
  var STRING_SHOW_VOLUME = '当前音量为百分之'
  var STRING_SHOW_MUTED = '设备已静音，已帮你调回到百分之'

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
    var action = _.get(options, 'action')

    logger.info(`trying to set volume to ${vol}`)
    return Promise.all([
      (() => {
        /**
         * Try reconfigure and set volume
         */
        var localVol = vol
        if (localVol < 0) {
          localVol = 0
        } else if (localVol > 100) {
          localVol = 100
        }

        if (AudioManager.isMuted() && localVol > 0) {
          /** if device is already muted, unmute it. */
          setUnmute({ recover: false })
        }

        var prevVolume = getVolume()
        AudioManager.setVolume(localVol)
        volume = localVol
        if (init) {
          return Promise.resolve()
        }
        return activity.light.play('system://setVolume', {
          volume: localVol,
          action: action || (localVol <= prevVolume ? 'decrease' : 'increase')
        })
      })(),
      (() => {
        if (vol > 0 && vol <= 100) {
          /** if volume to be set is in normal range, skip following */
          return Promise.resolve()
        }
        /** handles out of range conditions */
        if (vol <= 0) {
          setMute({ source: 'indirect' })
        }

        if (silent || init) {
          /** do not announce anything if silence is demanded. */
          return Promise.resolve()
        }
        return speakAndExit(STRING_RANGE_ERROR)
      })()
    ])
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
    var vol = getVolume()
    logger.info(`init volume to ${vol}`)
    vol = vol || defaultVolume
    return setVolume(vol, { init: true })
      .then(() => setUnmute({ recover: false }))
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

  function micMute (muted) {
    /** Only light effects, actual mic mute operation has been handled by runtime */
    return activity.light.play('system://setMuted', {
      muted: muted
    }).then(() => {
      return activity.exit()
    })
  }

  activity.on('request', function (nlp, action) {
    var partition = 10
    switch (nlp.intent) {
      case 'showvolume':
        if (AudioManager.isMuted()) {
          setUnmute({ init: true })
            .then(() => speakAndExit(STRING_SHOW_MUTED + Math.ceil(getVolume())))
        } else {
          speakAndExit(STRING_SHOW_VOLUME + Math.ceil(getVolume()))
        }
        break
      case 'set_volume_percent':
        setVolume(format(nlp.slots))
          .then(() => activity.exit())
        break
      case 'set_volume':
        setVolume(format(nlp.slots) * partition)
          .then(() => activity.exit())
        break
      case 'add_volume_num':
        incVolume(format(nlp.slots) * partition)
          .then(() => activity.exit())
        break
      case 'dec_volume_num':
        decVolume(format(nlp.slots) * partition)
          .then(() => activity.exit())
        break
      case 'volumeup':
      case 'volume_too_low':
        incVolume(100 / partition)
          .then(() => activity.exit())
        break
      case 'volumedown':
      case 'volume_too_high':
        decVolume(100 / partition)
          .then(() => activity.exit())
        break
      case 'volumemin':
        setVolume(10)
          .then(() => activity.exit())
        break
      case 'volumemax':
        setVolume(100)
          .then(() => activity.exit())
        break
      case 'volumemute':
        setMute()
          .then(() => activity.exit())
        break
      case 'cancelmute':
        setUnmute()
          .then(() => activity.exit())
        break
      default:
        activity.exit()
        break
    }
  })

  activity.on('url', url => {
    var partition = parseInt(_.get(url.query, 'partition', 16))
    var silent = _.get(url.query, 'silent') == null
    switch (url.pathname) {
      case '/init':
        initVolume()
        break
      case '/volume_up':
        incVolume(100 / partition, { silent: silent })
        break
      case '/volume_down':
        decVolume(100 / partition, { silent: silent })
        break
      case '/unmute':
        setUnmute({ init: /** prevent any possible audio */true })
        break
      case '/mic_mute_effect':
        micMute(true)
        break
      case '/mic_unmute_effect':
        micMute(false)
        break
    }
  })
}
