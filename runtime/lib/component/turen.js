var logger = require('logger')('turen')

var _ = require('@yoda/util')._
var wifi = require('@yoda/wifi')
var bluetooth = require('@yoda/bluetooth')

var VT_WORDS_ADD_WORD_CHANNEL = 'rokid.turen.addVtWord'
var VT_WORDS_DEL_WORD_CHANNEL = 'rokid.turen.removeVtWord'

module.exports = Turen
function Turen (runtime) {
  this.runtime = runtime
  this.component = runtime.component

  /**
   * indicates microphone muted or not.
   */
  this.muted = false

  /** if device is awaken */
  this.awaken = false
  /**
   * asr parsing state, possible values:
   * - pending
   * - fake
   * - end
   */
  this.asrState = 'end'
  /**
   * Turen picking up state.
   */
  this.pickingUp = false
  /**
   * if next nlp shall be discarded.
   */
  this.pickingUpDiscardNext = false

  /**
   * handle of timer to determines if current 'voice coming' session is alone,
   * no upcoming asr pending/end is sent in company with it.
   */
  this.solitaryVoiceComingTimeout = process.env.YODA_SOLITARY_VOICE_COMING_TIMEOUT || 9000
  this.solitaryVoiceComingTimer = null
  /**
   * handle of timer to determines if current awaken session is no voice input available so far,
   * no upcoming asr pending would be sent any way.
   */
  this.noVoiceInputTimeout = process.env.YODA_NO_VOICE_INPUT_TIMEOUT || 6000
  this.noVoiceInputTimer = null
}

Turen.prototype.init = function init () {
  if (this.bluetoothA2dp) {
    this.deinit()
  }
  this.bluetoothA2dp = bluetooth.getAdapter(bluetooth.protocol.PROFILE.A2DP)
}

Turen.prototype.deinit = function deinit () {
  if (this.bluetoothA2dp == null) {
    return
  }
  this.bluetoothA2dp.destroy()
}

/**
 * handles event received from turenproc
 * @param {string} name -
 * @param {object} data -
 * @private
 */
Turen.prototype.handleEvent = function (name, data) {
  if (this.muted) {
    logger.error('Mic muted, unexpected event from Turen:', name)
    return
  }
  var handler = null
  switch (name) {
    case 'voice coming':
      handler = this.handleVoiceComing
      break
    case 'voice local awake':
      handler = this.handleVoiceLocalAwake
      break
    case 'asr accept':
      handler = this.handleAsrProgress.bind(this, 'accept')
      break
    case 'asr pending':
      handler = this.handleAsrProgress.bind(this, 'pending')
      break
    case 'asr extra':
      handler = this.handleAsrProgress.bind(this, 'extra')
      break
    case 'asr end':
      handler = this.handleAsrEnd
      break
    case 'asr fake':
      handler = this.handleAsrFake
      break
    case 'asr reject':
      handler = this.handleAsrReject
      break
    case 'start voice':
      handler = this.handleStartVoice
      break
    case 'end voice':
      handler = this.handleEndVoice
      break
    case 'nlp':
      handler = this.handleNlpResult
      break
    case 'malicious nlp':
      handler = this.handleMaliciousNlpResult
      break
    case 'speech error':
      handler = this.handleSpeechError
      break
  }
  if (typeof handler !== 'function') {
    logger.info(`skip turen event "${name}" for no handler existing`)
    return
  }
  logger.debug(`handling turen event "${name}"`)
  return handler.call(this, data)
}

/**
 * Set device awaken state and appearance.
 */
Turen.prototype.setAwaken = function setAwaken () {
  var promises = []
  if (this.awaken) {
    logger.warn('already awaken')
  }
  this.awaken = true

  var currAppId = this.component.lifetime.getCurrentAppId()
  logger.info('awaking, current app', currAppId)

  /**
   * pause lifetime to prevent incoming app preemption;
   * doesn't care when pauseLifetime ends.
   */
  this.component.lifetime.pauseLifetime()

  /**
   * no need to determine if tts is previously been paused.
   */
  return Promise.all(promises)
}

/**
 * Set device end of awaken and remove awaken effects.
 *
 * @private
 * @param {object} [options] -
 * @param {boolean} [options.recover] - if recover previous paused app
 */
Turen.prototype.resetAwaken = function resetAwaken (options) {
  var recover = _.get(options, 'recover', true)

  if (!this.awaken) {
    logger.warn('runtime was not awaken, skipping reset awaken')
    return Promise.resolve()
  }
  this.awaken = false
  logger.info('reset awaken, recovering?', recover)
  clearTimeout(this.solitaryVoiceComingTimer)
  clearTimeout(this.noVoiceInputTimer)

  var promises = [
    this.component.light.stop('@yoda', 'system://awake.js'),
    this.component.lifetime.resumeLifetime({ recover: recover })
  ]

  if (!recover) {
    // do not stop previously paused tts. let the app handle it theirself
    return Promise.all(promises)
  }

  return Promise.all(promises.concat(this.recoverPausedOnAwaken()))
}

/**
 * Recovers paused tts/media on awaken.
 * @private
 */
Turen.prototype.recoverPausedOnAwaken = function recoverPausedOnAwaken () {
  var currentAppId = this.component.lifetime.getCurrentAppId()

  logger.info('unmute possibly paused bluetooth player')
  this.bluetoothA2dp && this.bluetoothA2dp.unmute()

  logger.info('trying to resume previously awaken paused tts/media', currentAppId)
  return Promise.all([
    this.runtime.ttsMethod('resetAwaken', [ currentAppId ]),
    this.runtime.multimediaMethod('resetAwaken', [ currentAppId ])
  ])
}

/**
 * Clears memoized paused tts/media on awaken.
 * @private
 */
Turen.prototype.resetPausedOnAwaken = function resetPausedOnAwaken () {
  logger.info('trying to reset previously awaken paused tts/media')
  return Promise.all([
    this.runtime.ttsMethod('resetAwaken', [ '' ]),
    this.runtime.multimediaMethod('resetAwaken', [ '' ])
  ])
}

/**
 * Handle the "voice coming" event.
 * @private
 */
Turen.prototype.handleVoiceComing = function handleVoiceComing (data) {
  if (!this.component.custodian.isPrepared()) {
    logger.warn('Network not connected, preparing to announce unavailability.')
    this.pickup(false)

    var currentAppId = this.component.lifetime.getCurrentAppId()
    if (this.component.custodian.isConfiguringNetwork()) {
      /**
       * Configuring network, delegates event to network app.
       */
      logger.info('configuring network, renewing timer.')
      return this.runtime.openUrl('yoda-skill://network/renew')
    }

    if (wifi.getNumOfHistory() === 0) {
      if (currentAppId) {
        /**
         * although there is no WiFi history, yet some app is running out there,
         * continuing currently app.
         */
        logger.info('no WiFi history exists, continuing currently running app.')
        return this.component.light.ttsSound('@yoda', 'system://guide_config_network.ogg')
          .then(() =>
          /** awaken is not set for no network available, recover media directly */
            this.recoverPausedOnAwaken()
          )
      }
      /**
       * No WiFi connection history found, introduce device setup procedure.
       */
      logger.info('no WiFi history exists, announcing guide to network configuration.')
      return this.component.light.ttsSound('@yoda', 'system://guide_config_network.ogg')
        .then(() =>
          /** awaken is not set for no network available, recover media directly */
          this.recoverPausedOnAwaken()
        )
    }

    /**
     * if runtime is logging in or network is unavailable,
     * and there is WiFi history existing,
     * announce WiFi is connecting.
     */
    logger.info('announcing network connecting on voice coming.')
    wifi.enableScanPassively()
    return this.component.light.ttsSound('@yoda', 'system://wifi_is_connecting.ogg')
      .then(() =>
        /** awaken is not set for no network available, recover media directly */
        this.recoverPausedOnAwaken()
      )
  }

  var future = this.setAwaken()
  clearTimeout(this.solitaryVoiceComingTimer)
  this.solitaryVoiceComingTimer = setTimeout(() => {
    logger.warn('detected a solitary voice coming, resetting awaken')
    this.pickup(false)

    if (this.awaken) {
      return this.announceNetworkLag()
    }
  }, this.solitaryVoiceComingTimeout)

  if (this.runtime.forceUpdateAvailable) {
    future.then(
      () => this.runtime.startForceUpdate(),
      err => {
        logger.error('unexpected error on set awaken', err.stack)
        return this.runtime.startForceUpdate()
      }
    )
  }

  /**
   * reset picking up discarding state to enable next nlp process
   */
  this.pickingUpDiscardNext = false

  return future
}

/**
 * Handle the "voice local awake" event.
 * @private
 */
Turen.prototype.handleVoiceLocalAwake = function handleVoiceLocalAwake (data) {
  /**
   * Nothing to do in local_awake event.
   */
}

/**
 * Handle the "asr accept"/"asr pending" event.
 * @private
 */
Turen.prototype.handleAsrProgress = function handleAsrProgress (state) {
  this.asrState = state
  clearTimeout(this.solitaryVoiceComingTimer)

  clearTimeout(this.noVoiceInputTimer)
  this.noVoiceInputTimer = setTimeout(() => {
    logger.warn('no more voice input detected, closing pickup')
    this.pickup(false)
  }, this.noVoiceInputTimeout)
}

/**
 * Handle the "asr end" event.
 * @private
 */
Turen.prototype.handleAsrEnd = function handleAsrEnd () {
  this.asrState = 'end'
  clearTimeout(this.noVoiceInputTimer)

  var promises = [
    this.resetAwaken({
      recover: /** no recovery shall be made on nlp coming */ false
    })
  ]

  if (this.pickingUpDiscardNext) {
    /**
     * current session of picking up has been manually discarded,
     * no loading state shall be presented.
     */
    return Promise.all(promises)
  }
  return Promise.all(promises.concat(this.component.light.play('@yoda', 'system://loading.js')))
}

/**
 * Handle the "asr reject" event.
 */
Turen.prototype.handleAsrReject = function handleAsrReject () {
  this.asrState = 'reject'
  this.resetAwaken()
}

/**
 * Handle the "asr fake" event.
 * @private
 */
Turen.prototype.handleAsrFake = function handleAsrFake () {
  this.asrState = 'fake'
  clearTimeout(this.noVoiceInputTimer)

  return this.resetAwaken()
}

/**
 * Handle the "start voice" event.
 * @private
 */
Turen.prototype.handleStartVoice = function handleStartVoice () {
  this.pickingUp = true
}

/**
 * Handle the "end voice" event.
 * @private
 */
Turen.prototype.handleEndVoice = function handleEndVoice () {
  this.pickingUp = false
  logger.info('on end of voice, asr:', this.asrState)
}

/**
 * Handle the "nlp" event.
 * @private
 */
Turen.prototype.handleNlpResult = function handleNlpResult (data) {
  if (this.pickingUpDiscardNext) {
    /**
     * current session of picking up has been manually discarded.
     */
    this.pickingUpDiscardNext = false
    logger.warn(`discarding nlp for pick up discarded, ASR(${_.get(data, 'nlp.asr')}).`)
    return
  }

  var future
  if (this.awaken) {
    future = this.resetAwaken({
      recover: /** no recovery shall be made on nlp coming */ false
    })
  } else {
    future = Promise.resolve()
  }
  return future.then(() => this.runtime.onVoiceCommand(data.asr, data.nlp, data.action))
    .then(success => {
      this.component.light.stop('@yoda', 'system://loading.js')
      if (success) {
        /**
         * Reset previously paused media to prevent un-intended recovering
         */
        return this.resetPausedOnAwaken()
      }
      /**
       * try to recover paused tts/media on awaken in case of
       * failed to handle incoming nlp request.
       */
      this.recoverPausedOnAwaken()
    }, err => {
      this.component.light.stop('@yoda', 'system://loading.js')
      logger.error('Unexpected error on open handling nlp', err.stack)
    })
}

/**
 * Handle the "nlp" event, which are emitted on incoming unexpected malicious nlp.
 */
Turen.prototype.handleMaliciousNlpResult = function handleMaliciousNlpResult () {
  if (this.awaken) {
    this.pickup(false)
    this.resetAwaken({ recover: false })
  }
  if (!this.component.custodian.isPrepared()) {
    logger.warn('Network not connected, recovering players.')
    return this.recoverPausedOnAwaken()
  }

  /**
   * Reset previously paused media to prevent un-intended recovering
   */
  this.resetPausedOnAwaken()
  return this.runtime.openUrl('yoda-skill://rokid-exception/malicious-nlp')
    .then(
      () => this.component.light.stop('@yoda', 'system://loading.js'),
      err => {
        this.component.light.stop('@yoda', 'system://loading.js')
        logger.error('Unexpected error on open handling malicious nlp', err.stack)
      })
}

/**
 * Handle 'speech error' events, which are emitted on unexpected speech faults.
 */
Turen.prototype.handleSpeechError = function handleSpeechError (errCode) {
  if (this.awaken) {
    this.pickup(false)
    this.resetAwaken({ recover: false })
  }
  if (!this.component.custodian.isPrepared()) {
    logger.warn('Network not connected or not logged in, recovering players.')
    return this.recoverPausedOnAwaken()
  }

  if (errCode >= 100) {
    /** network error */
    return this.announceNetworkLag()
  }

  /**
   * FIXME: Raison d'etre
   * cut app like alarm/timer shall be deactivated on awaken.
   * Currently @yoda/system handles speech error in a such quick way, yet for
   * some reason apps like cloud-app-client could not determines tts/media
   * status in such a short time(events have to be transferred through
   * 2/3 ipc).
   * Thus just closing cut app here works as expected, and shall be fixed
   * with a invocation queue in translator-ipc.
   */
  this.component.lifetime.deactivateCutApp()
    .then(() => {
      this.recoverPausedOnAwaken()
      return this.component.light.stop('@yoda', 'system://loading.js')
    }, err => {
      this.component.light.stop('@yoda', 'system://loading.js')
      logger.error('Unexpected error on deactivating cut app', err.stack)
    })
}

/**
 * Set whether or not turenproc is picked up.
 * @param {boolean} isPickup
 */
Turen.prototype.pickup = function pickup (isPickup) {
  /**
   * if set not to picking up, discard next coming nlp,
   * otherwise reset picking up discarding state to enable next nlp process,
   */
  this.pickingUpDiscardNext = !isPickup
  this.component.flora.post('rokid.turen.pickup', [ isPickup ? 1 : 0 ])

  if (!isPickup) {
    clearTimeout(this.solitaryVoiceComingTimer)
    clearTimeout(this.noVoiceInputTimer)
  }
}

/**
 * Set whether or not turenproc is muted. By default toggles mute.
 * @param {boolean} [mute]
 */
Turen.prototype.toggleMute = function toggleMute (mute) {
  if (mute == null) {
    mute = !this.muted
  }
  this.muted = mute
  /** if mute is true, set rokid.turen.mute to 1 to disable turen */
  this.component.flora.post('rokid.turen.mute', [ mute ? 1 : 0 ])

  if (this.asrState === 'pending' && mute) {
    this.resetAwaken()
  }

  return this.muted
}

/**
 * Add an activation word.
 * @param {string} activationTxt
 * @param {string} activationPy
 */
Turen.prototype.addVtWord = function addVtWord (activationWord, activationPy) {
  this.component.flora.post(VT_WORDS_ADD_WORD_CHANNEL, [
    activationWord,
    activationPy,
    1
  ])
}

/**
 * Delete an activation word
 * @param {string} activationTxt
 */
Turen.prototype.deleteVtWord = function deleteVtWord (activationWord) {
  this.component.flora.post(VT_WORDS_DEL_WORD_CHANNEL, [ activationWord ])
}

/**
 * Announce possible network lag. Reset awaken/recover paused media on end of announcements.
 */
Turen.prototype.announceNetworkLag = function announceNetworkLag () {
  if (this.awaken) {
    this.resetAwaken({ recover: false })
  }
  return this.component.light.lightMethod('networkLagSound', [ '/opt/media/network_lag_common.ogg' ])
    .then(
      () => {
        /** stop network lag light effects */
        this.component.light.lightMethod('stopNetworkLagSound', [])
        if (this.awaken) {
          return
        }
        return this.recoverPausedOnAwaken()
      },
      err => {
        logger.error('Unexpected error on playing network lag sound', err.stack)
        /** stop network lag light effects */
        this.component.light.lightMethod('stopNetworkLagSound', [])
        if (this.awaken) {
          return
        }
        return this.recoverPausedOnAwaken()
      }
    )
}
