
var logger = require('logger')('flora')
var inherits = require('util').inherits

var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')
var _ = require('@yoda/util')._

var floraConfig = require('/etc/yoda/flora-config.json')
var globalEnv = require('@yoda/env')()
var ovsdkConfig = require('/etc/yoda/openvoice-sdk.json')

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
    /** [ event, ttsId, Optional(errno) ] */
    msg.splice(2, 1)
    descriptor.tts.handleEvent.apply(descriptor.tts, msg)
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
  this.call('asr2nlp', [ asr, skillOptions ], 'speech-service', 6000)
    .then((resp) => {
      if (resp.retCode !== 0) {
        cb(new Error('speech service asr2nlp failed: ' + resp.retCode))
      } else {
        var nlp, action, err
        try {
          nlp = JSON.parse(resp.msg[0])
          action = JSON.parse(resp.msg[1])
        } catch (ex) {
          err = ex
          logger.log('nlp/action parse failed, discarded')
        }
        cb(err, nlp, action)
      }
    }).catch((err) => {
      cb(new Error('invoke speech-service.asr2nlp failed: ' + err))
    })
}
