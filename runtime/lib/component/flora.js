
var logger = require('logger')('flora')
var inherits = require('util').inherits

var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')

var floraConfig = require('/etc/yoda/flora-config.json')
var globalEnv = require('@yoda/env')()

var asr2nlpId = 'js-AppRuntime'
var asr2nlpSeq = 0

module.exports = Flora
/**
 *
 * @param {AppRuntime} runtime
 */
function Flora (runtime) {
  FloraComp.call(this, logger)
  this.runtime = runtime
  this.component = runtime.component
  this.speechAuthInfo = null
  this.voiceCtx = { lastFaked: false }

  this.asr2nlpCallbacks = {}
}
inherits(Flora, FloraComp)

Flora.prototype.handlers = {
  'rokid.turen.voice_coming': function (msg) {
    logger.log('voice coming')
    this.voiceCtx.lastFaked = false
    this.component.turen.handleEvent('voice coming', {})
  },
  'rokid.turen.local_awake': function (msg) {
    logger.log('voice local awake')
    var data = {}
    data.sl = msg[0]
    this.component.turen.handleEvent('voice local awake', data)
  },
  'rokid.speech.inter_asr': function (msg) {
    var asr = msg[0]
    logger.log('asr pending', asr)
    this.component.turen.handleEvent('asr pending', asr)
  },
  'rokid.speech.final_asr': function (msg) {
    var asr = msg[0]
    logger.log('asr end', asr)
    this.component.turen.handleEvent('asr end', { asr: asr })
  },
  'rokid.speech.extra': function (msg) {
    var data = JSON.parse(msg[0])
    switch (data.activation) {
      case 'accept': {
        this.component.turen.handleEvent('asr accept')
        break
      }
      case 'fake': {
        this.voiceCtx.lastFaked = true
        this.component.turen.handleEvent('asr fake')
        break
      }
      case 'reject': {
        this.component.turen.handleEvent('asr reject')
        break
      }
      default:
        logger.info('Unhandled speech extra', data)
        this.component.turen.handleEvent('asr extra', data)
    }
  },
  'rokid.turen.start_voice': function (msg) {
    this.component.turen.handleEvent('start voice')
  },
  'rokid.turen.end_voice': function (msg) {
    this.component.turen.handleEvent('end voice')
  },
  'rokid.speech.nlp': function (msg) {
    if (this.voiceCtx.lastFaked) {
      logger.info('skip nlp, because last voice is fake')
      this.voiceCtx.lastFaked = false
      return
    }

    logger.log(`NLP(${msg[0]}), action(${msg[1]})`)
    var data = {}
    data.asr = ''
    try {
      data.nlp = JSON.parse(msg[0])
      data.action = JSON.parse(msg[1])
    } catch (err) {
      logger.log('nlp/action parse failed, discarded.')
      return this.component.turen.handleEvent('malicious nlp', data)
    }
    this.component.turen.handleEvent('nlp', data)
  },
  'rokid.speech.error': function (msg) {
    var errCode = msg[0]
    var speechId = msg[1]
    logger.error(`Unexpected speech error(${errCode}) for speech(${speechId}).`)
    return this.component.turen.handleEvent('speech error', errCode, speechId)
  }
}
Flora.prototype.handlers[`rokid.speech.nlp.${asr2nlpId}`] = onAsr2Nlp
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
Flora.prototype.handlers[`rokid.speech.error.${asr2nlpId}`] = onAsr2NlpError
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
  FloraComp.prototype.init.call(this, 'vui', floraConfig)
  this.post('rokid.speech.options', [
    0,
    0,
    1, 500,
    0,
    0,
    globalEnv.speechVadBegin,
    globalEnv.speechVoiceFragment
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
    globalEnv.speechReconnInterval,
    globalEnv.speechPingInterval,
    globalEnv.speechNoRespTimeout
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
