
var logger = require('logger')('flora')
var inherits = require('util').inherits

var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')
var _ = require('@yoda/util')._

var floraConfig = require('/etc/yoda/flora-config.json')
var globalEnv = require('@yoda/env')()
var ovsdkConfig = require('/etc/yoda/openvoice-sdk.json')

var asr2nlpId = 'js-AppRuntime'
var asr2nlpSeq = 0

module.exports = Flora
/**
 *
 * @param {AppRuntime} runtime
 */
function Flora (runtime) {
  FloraComp.call(this, 'vui', floraConfig)
  this.runtime = runtime
  this.component = runtime.component
  this.speechAuthInfo = null

  this.asr2nlpCallbacks = {}
}
inherits(Flora, FloraComp)

Flora.prototype.handlers = {
  'yodart.ttsd.event': function onTtsEvent (msg) {
    /** msg: [ event, ttsId, appId, Optional(errno) ] */
    var event = msg[0]
    var ttsId = msg[1]
    var appId = msg[2]
    logger.info(`VuiDaemon received ttsd event(${event}) for app(${appId}), tts(${ttsId})`)
    var descriptor = _.get(this.component.appScheduler.appMap, appId)
    if (descriptor == null) {
      logger.warn(`app is not alive, ignoring tts event(${event} for app(${appId})`)
      return
    }
    msg.splice(2, 1)
    /** emit: [ ttsId, Optional(errno) ] */
    descriptor.tts.emit.apply(descriptor.tts, msg)
  },
  [`rokid.speech.nlp.${asr2nlpId}`]: onAsr2Nlp,
  [`rokid.speech.error.${asr2nlpId}`]: onAsr2NlpError
}

/**
 * @this Flora
 */
function onAsr2Nlp (msg) {
  var nlp
  var action
  var err
  var seq
  try {
    nlp = JSON.parse(msg[0])
    action = JSON.parse(msg[1])
    seq = msg[2]
  } catch (ex) {
    logger.log('nlp/action parse failed, discarded')
    err = ex
  }

  if (typeof this.asr2nlpCallbacks[seq] === 'function') {
    this.asr2nlpCallbacks[seq](err, nlp, action)
    delete this.asr2nlpCallbacks[seq]
  }
}

/**
 * @this Flora
 */
function onAsr2NlpError (msg) {
  var err
  var seq
  err = new Error('speech put_text return error: ' + msg[0])
  seq = msg[1]

  if (typeof this.asr2nlpCallbacks[seq] === 'function') {
    this.asr2nlpCallbacks[seq](err)
    delete this.asr2nlpCallbacks[seq]
  }
}

/**
 * Initialize flora client.
 */
Flora.prototype.init = function init () {
  FloraComp.prototype.init.call(this)
  this.post('rokid.speech.options', [
    ovsdkConfig.speech.lang,
    ovsdkConfig.speech.codec,
    ovsdkConfig.speech.vadMode,
    ovsdkConfig.speech.vadEndTimeout,
    ovsdkConfig.speech.noNlp,
    ovsdkConfig.speech.noIntermediateAsr,
    ovsdkConfig.speech.vadBegin,
    ovsdkConfig.speech.voiceFragment
  ], floraFactory.MSGTYPE_PERSIST)
}

/**
 * Update speech service configuration.
 *
 * @param {object} speechAuthInfo
 */
Flora.prototype.updateSpeechPrepareOptions = function updateSpeechPrepareOptions (speechAuthInfo) {
  if (speechAuthInfo == null) {
    return
  }
  var uri = globalEnv.speechUri
  if (speechAuthInfo.uri) {
    uri = speechAuthInfo.uri
  }
  this.post('rokid.speech.prepare_options', [
    uri,
    speechAuthInfo.key,
    speechAuthInfo.deviceTypeId,
    speechAuthInfo.secret,
    speechAuthInfo.deviceId,
    ovsdkConfig.common.reconnInterval,
    ovsdkConfig.common.pingInterval,
    ovsdkConfig.common.noRespTimeout
  ], floraFactory.MSGTYPE_PERSIST)
}

/**
 * Update cloud skill stack.
 *
 * @param {string} stack
 */
Flora.prototype.updateStack = function updateStack (stack) {
  logger.info('setStack', stack)
  this.post('rokid.speech.stack', [ stack ], floraFactory.MSGTYPE_PERSIST)
}

/**
 * Get NLP result of given asr text.
 * @param {string} asr
 * @param {object} skillOptions
 * @param {Function} cb
 */
Flora.prototype.getNlpResult = function getNlpResult (asr, skillOptions, cb) {
  if (typeof skillOptions === 'function') {
    cb = skillOptions
    skillOptions = {}
  }
  if (typeof asr !== 'string' || typeof skillOptions !== 'object' || typeof cb !== 'function') {
    throw TypeError('Invalid argument of getNlpResult')
  }
  skillOptions = JSON.stringify(skillOptions)
  ++asr2nlpSeq
  this.asr2nlpCallbacks[asr2nlpSeq] = cb
  this.post('rokid.speech.put_text', [
    asr,
    skillOptions,
    asr2nlpId,
    asr2nlpSeq
  ], floraFactory.MSGTYPE_INSTANT)
}

/**
 *
 * @param {object} cbs
 * @param {string} msg
 */
/**
function handleErrorCallbacks (cbs, msg) {
  var err = new Error(msg)

  Object.keys(cbs).forEach(key => {
    cbs[key] && cbs[key](err)
  })
}
*/
