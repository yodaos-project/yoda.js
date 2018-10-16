var logger = require('logger')('turen')

var _ = require('@yoda/util')._
var wifi = require('@yoda/wifi')
var Caps = require('@yoda/flora').Caps
var bluetooth = require('@yoda/bluetooth')

var VT_WORDS_ADD_WORD_CHANNEL = 'rokid.turen.addVtWord'
var VT_WORDS_DEL_WORD_CHANNEL = 'rokid.turen.removeVtWord'

module.exports = Turen
function Turen (runtime) {
  this.runtime = runtime

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
  this.solitaryVoiceComingTimer = null
}

Turen.prototype.init = function init () {
  if (this.bluetoothPlayer) {
    this.destruct()
  }
  this.bluetoothPlayer = bluetooth.getPlayer()
}

Turen.prototype.destruct = function destruct () {
  if (this.bluetoothPlayer == null) {
    return
  }
  this.bluetoothPlayer._flora.destruct()
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
    case 'asr pending':
      handler = this.handleAsrPending
      break
    case 'asr end':
      handler = this.handleAsrEnd
      break
    case 'asr fake':
      handler = this.handleAsrFake
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

  var currAppId = this.runtime.life.getCurrentAppId()
  logger.info('awaking, current app', currAppId)

  /**
   * pause lifetime to prevent incoming app preemption;
   * doesn't care when pauseLifetime ends.
   */
  this.runtime.life.pauseLifetime()

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

  var promises = [
    this.runtime.light.stop('@yoda', 'system://awake.js'),
    this.runtime.life.resumeLifetime({ recover: recover })
  ]

  if (!recover) {
    // do not stop previously paused tts. let the app handle it theirself
    return Promise.all(promises)
  }

  var currentAppId = this.runtime.life.getCurrentAppId()
  logger.info('trying to resume previously awaken paused tts of app', currentAppId)
  promises.push(this.runtime.ttsMethod('resetAwaken', [ currentAppId ]))

  logger.info('trying to resume previously awaken paused media')
  promises.push(this.runtime.multimediaMethod('resetAwaken', [ currentAppId ]))

  logger.info('unmute possibly paused bluetooth player')
  this.bluetoothPlayer && this.bluetoothPlayer.resume()

  return Promise.all(promises)
}

/**
 * Handle the "voice coming" event.
 * @private
 */
Turen.prototype.handleVoiceComing = function handleVoiceComing (data) {
  if (!this.runtime.custodian.isPrepared()) {
    // Do noting when network is not ready
    logger.warn('Network not connected, skip incoming voice')
    return
  }

  var future = this.setAwaken()
  clearTimeout(this.solitaryVoiceComingTimer)
  this.solitaryVoiceComingTimer = setTimeout(() => {
    logger.warn('detected a solitary voice coming, resetting awaken')
    this.resetAwaken()
  }, process.env.APP_KEEPALIVE_TIMEOUT || 6000)

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
  if (this.runtime.life.getCurrentAppId() === '@yoda/network') {
    this.runtime.openUrl('yoda-skill://network/renew')
    return
  }
  if (wifi.getNumOfHistory() === 0) {
    this.runtime.openUrl('yoda-skill://network/setup', {
      preemptive: true
    })
    return
  }
  if (this.runtime.custodian.isNetworkUnavailable()) {
    wifi.enableScanPassively()
    return this.runtime.light.appSound('@yoda', 'system://wifi_is_connecting.ogg')
  }
}

/**
 * Handle the "asr pending" event.
 * @private
 */
Turen.prototype.handleAsrPending = function handleAsrPending () {
  this.asrState = 'pending'
  clearTimeout(this.solitaryVoiceComingTimer)
}

/**
 * Handle the "asr end" event.
 * @private
 */
Turen.prototype.handleAsrEnd = function handleAsrEnd () {
  this.asrState = 'end'
  return this.resetAwaken({
    recover: /** no recovery shall be made on nlp coming */ false
  }).then(() => {
    if (this.pickingUpDiscardNext) {
      /**
       * current session of picking up has been manually discarded,
       * no loading state shall be presented.
       */
      return
    }
    return this.runtime.light.play('@yoda', 'system://loading.js')
  })
}

/**
 * Handle the "asr fake" event.
 * @private
 */
Turen.prototype.handleAsrFake = function handleAsrFake () {
  this.asrState = 'fake'
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
  if (this.asrState === 'end') {
    return
  }
  return this.resetAwaken()
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
  if (this.runtime.sound.isMuted() && !this.runtime.sound.isVolumeNlp(data.nlp)) {
    /**
     * Unmute speaker volume if it's muted and ongoing nlp is not
     * volume app (which depends on state of speaker).
     */
    this.runtime.sound.unmute()
  }
  return this.resetAwaken({
    recover: /** no recovery shall be made on nlp coming */ false
  }).then(() => this.runtime.onVoiceCommand(data.asr, data.nlp, data.action))
}

/**
 * Handle the "nlp" event, which are emitted on incoming unexpected malicious nlp.
 */
Turen.prototype.handleMaliciousNlpResult = function handleMaliciousNlpResult () {
  this.runtime.openUrl('yoda-skill://rokid-exception/malicious-nlp')
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

  var msg = new Caps()
  msg.writeInt32(isPickup ? 1 : 0)
  this.runtime.flora.post('rokid.turen.pickup', msg)
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
  var msg = new Caps()
  /** if mute is true, set rokid.turen.mute to 1 to disable turen */
  msg.writeInt32(mute ? 1 : 0)
  this.runtime.flora.post('rokid.turen.mute', msg)

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
  var caps = new Caps()
  caps.write(activationWord)
  caps.write(activationPy)
  caps.writeInt32(1)
  this.runtime.flora.post(VT_WORDS_ADD_WORD_CHANNEL, caps)
}

/**
 * Delete an activation word
 * @param {string} activationTxt
 */
Turen.prototype.deleteVtWord = function deleteVtWord (activationWord) {
  var caps = new Caps()
  caps.write(activationWord)
  this.runtime.flora.post(VT_WORDS_DEL_WORD_CHANNEL, caps)
}
