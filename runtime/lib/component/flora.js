
var logger = require('logger')('flora')
var inherits = require('util').inherits

var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')

var floraConfig = require('../../flora-config.json')
var globalEnv = require('../env')()

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
  this.speechAuthInfo = null
  this.voiceCtx = { lastFaked: false }

  this.asr2nlpCallbacks = {}
}
inherits(Flora, FloraComp)

Flora.prototype.handlers = {
  'rokid.turen.voice_coming': function (msg) {
    logger.log('voice coming')
    this.voiceCtx.lastFaked = false
    this.runtime.turen.handleEvent('voice coming', {})
  },
  'rokid.turen.local_awake': function (msg) {
    logger.log('voice local awake')
    var data = {}
    data.sl = msg.get(0)
    this.runtime.turen.handleEvent('voice local awake', data)
  },
  'rokid.speech.inter_asr': function (msg) {
    var asr = msg.get(0)
    logger.log('asr pending', asr)
    this.runtime.turen.handleEvent('asr pending', asr)
  },
  'rokid.speech.final_asr': function (msg) {
    var asr = msg.get(0)
    logger.log('asr end', asr)
    this.runtime.turen.handleEvent('asr end', { asr: asr })
  },
  'rokid.speech.extra': function (msg) {
    var data = JSON.parse(msg.get(0))
    if (data.activation === 'fake') {
      this.voiceCtx.lastFaked = true
      this.runtime.turen.handleEvent('asr fake')
    }
  },
  'rokid.turen.start_voice': function (msg) {
    this.runtime.turen.handleEvent('start voice')
  },
  'rokid.turen.end_voice': function (msg) {
    this.runtime.turen.handleEvent('end voice')
  },
  'rokid.speech.nlp': function (msg) {
    if (this.voiceCtx.lastFaked) {
      logger.info('skip nlp, because last voice is fake')
      this.voiceCtx.lastFaked = false
      return
    }

    logger.log(`NLP(${msg.get(0)}), action(${msg.get(1)})`)
    var data = {}
    data.asr = ''
    try {
      data.nlp = JSON.parse(msg.get(0))
      data.action = JSON.parse(msg.get(1))
    } catch (err) {
      logger.log('nlp/action parse failed, discarded.')
      return this.runtime.turen.handleEvent('malicious nlp', data)
    }
    this.runtime.turen.handleEvent('nlp', data)
  },
  'rokid.speech.error': function (msg) {
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
    nlp = JSON.parse(msg.get(0))
    action = JSON.parse(msg.get(1))
    seq = msg.get(2)
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
  err = new Error('speech put_text return error: ' + msg.get(0))
  seq = msg.get(1)

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

  var msg = new floraFactory.Caps()
  // lang
  msg.writeInt32(0)
  // codec
  msg.writeInt32(0)
  // vad mode + timeout
  msg.writeInt32(1)
  msg.writeInt32(500)
  // no nlp
  msg.writeInt32(0)
  // no intermediate asr
  msg.writeInt32(0)
  // vad begin
  msg.writeInt32(globalEnv.speechVadBegin)
  // max voice fragment size
  msg.writeInt32(globalEnv.speechVoiceFragment)
  this.post('rokid.speech.options', msg, floraFactory.MSGTYPE_PERSIST)
}

/**
 * Flora disconnection event handler.
 */
Flora.prototype.onDisconnect = function onDisconnect () {
  FloraComp.prototype.onDisconnect.call(this)

  // clear pending callback functions
  var cbs = this.asr2nlpCallbacks
  this.asr2nlpCallbacks = {}
  process.nextTick(() => handleErrorCallbacks(cbs, 'flora client disconnected'))
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
  var uri = 'wss://apigwws.open.rokid.com:443/api'
  var msg = new floraFactory.Caps()
  if (speechAuthInfo.uri) {
    uri = speechAuthInfo.uri
  }
  msg.write(uri)
  msg.write(speechAuthInfo.key)
  msg.write(speechAuthInfo.deviceTypeId)
  msg.write(speechAuthInfo.secret)
  msg.write(speechAuthInfo.deviceId)
  // reconn interval
  msg.writeInt32(10000)
  // ping interval
  msg.writeInt32(10000)
  // noresp timeout
  msg.writeInt32(20000)
  this.post('rokid.speech.prepare_options', msg, floraFactory.MSGTYPE_PERSIST)
}

/**
 * Update cloud skill stack.
 *
 * @param {string} stack
 */
Flora.prototype.updateStack = function updateStack (stack) {
  logger.info('setStack', stack)
  var msg = new floraFactory.Caps()
  msg.write(stack)
  this.post('rokid.speech.stack', msg, floraFactory.MSGTYPE_PERSIST)
}

/**
 * Get NLP result of given asr text.
 * @param {string} asr
 * @param {Function} cb
 */
Flora.prototype.getNlpResult = function getNlpResult (asr, skillOptions, cb) {
  if (typeof skillOptions === 'function') {
    cb = skillOptions
    skillOptions = ''
  }
  if (typeof asr !== 'string' || typeof skillOptions !== 'string' || typeof cb !== 'function') {
    throw TypeError()
  }
  if (this.__cli == null) {
    return process.nextTick(() => cb(new Error('flora service connect failed')))
  }
  var caps = new floraFactory.Caps()
  caps.write(asr)
  caps.write(skillOptions)
  caps.write(asr2nlpId)
  caps.writeInt32(asr2nlpSeq)
  this.asr2nlpCallbacks[asr2nlpSeq++] = cb
  this.post('rokid.speech.put_text', caps, floraFactory.MSGTYPE_INSTANT)
}

/**
 *
 * @param {object} cbs
 * @param {string} msg
 */
function handleErrorCallbacks (cbs, msg) {
  var err = new Error(msg)

  Object.keys(cbs).forEach(key => {
    cbs[key] && cbs[key](err)
  })
}
