
var logger = require('logger')('flora')
var floraFactory = require('@yoda/flora')

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
  this.runtime = runtime
  this.floraCli = null
  this.speechAuthInfo = null
  this.voiceCtx = { lastFaked: false }

  this.asr2nlpCallbacks = {}
}

Flora.prototype.handlers = {
  'rokid.turen.voice_coming': function (msg) {
    logger.log('voice coming')
    this.voiceCtx.lastFaked = false
    this.runtime.onTurenEvent('voice coming', {})
  },
  'rokid.turen.local_awake': function (msg) {
    logger.log('voice local awake')
    var data = {}
    data.sl = msg.get(0)
    this.runtime.onTurenEvent('voice local awake', data)
  },
  'rokid.speech.inter_asr': function (msg) {
    var asr = msg.get(0)
    logger.log('asr pending', asr)
    this.runtime.onTurenEvent('asr pending', asr)
  },
  'rokid.speech.final_asr': function (msg) {
    var asr = msg.get(0)
    logger.log('asr end', asr)
    this.runtime.onTurenEvent('asr end', { asr: asr })
  },
  'rokid.speech.extra': function (msg) {
    var data = JSON.parse(msg.get(0))
    if (data.activation === 'fake') {
      this.voiceCtx.lastFaked = true
      this.runtime.onTurenEvent('asr fake')
    }
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
      return
    }
    this.runtime.onTurenEvent('nlp', data)
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
  logger.info('start initializing flora client')
  var cli = floraFactory.connect(floraConfig.uri + '#vui', floraConfig.bufsize)
  if (!cli) {
    logger.warn('flora connect failed, try again after', floraConfig.reconnInterval, 'milliseconds')
    setTimeout(() => this.init(), floraConfig.reconnInterval)
    return
  }
  cli.on('recv_post', this.onRecvPost.bind(this))
  cli.on('disconnected', this.onDisconnect.bind(this))

  Object.keys(this.handlers).forEach(it => {
    cli.subscribe(it, floraFactory.MSGTYPE_INSTANT)
  })

  this.updateSpeechPrepareOptions()

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
  cli.post('rokid.speech.options', msg, floraFactory.MSGTYPE_PERSIST)
  this.floraCli = cli
}

Flora.prototype.destruct = function destruct () {
  if (this.floraCli == null) {
    return
  }
  this.floraCli.close()
}

/**
 * Flora recv_post channel message handler.
 *
 * @param {string} name
 * @param {string} type
 * @param {string} msg
 */
Flora.prototype.onRecvPost = function onRecvPost (name, type, msg) {
  var handler = this.handlers[name]
  if (handler == null) {
    logger.error(`No handler found for ${name}`)
    return
  }
  handler.call(this, msg)
}

/**
 * Flora disconnection event handler.
 */
Flora.prototype.onDisconnect = function onDisconnect () {
  logger.warn('flora disconnected, try reconnect')
  this.floraCli.close()
  this.init()

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
  if (this.floraCli == null) {
    return
  }
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
  this.floraCli.post('rokid.speech.prepare_options', msg, floraFactory.MSGTYPE_PERSIST)
}

/**
 * Update cloud skill stack.
 *
 * @param {string} stack
 */
Flora.prototype.updateStack = function updateStack (stack) {
  if (this.floraCli == null) {
    return
  }
  logger.info('setStack', stack)
  var msg = new floraFactory.Caps()
  msg.write(stack)
  this.floraCli.post('rokid.speech.stack', msg, floraFactory.MSGTYPE_PERSIST)
}

/**
 * Set whether or not turenproc is picked up.
 * @param {boolean} isPickup
 */
Flora.prototype.turenPickup = function turenPickup (isPickup) {
  if (this.floraCli == null) {
    return
  }
  var msg = new floraFactory.Caps()
  msg.writeInt32(isPickup ? 1 : 0)
  this.floraCli.post('rokid.turen.pickup', msg, floraFactory.MSGTYPE_INSTANT)
}

/**
 * Set whether or not turenproc is muted.
 * @param {boolean} mute
 */
Flora.prototype.turenMute = function turenMute (mute) {
  if (this.floraCli == null) {
    return
  }
  var msg = new floraFactory.Caps()
  /** if mute is true, set rokid.turen.mute to 1 to disable turen */
  msg.writeInt32(mute ? 1 : 0)
  this.floraCli.post('rokid.turen.mute', msg, floraFactory.MSGTYPE_INSTANT)
}

/**
 * Get NLP result of given asr text.
 * @param {string} asr
 * @param {Function} cb
 */
Flora.prototype.getNlpResult = function getNlpResult (asr, cb) {
  if (typeof asr !== 'string' || typeof cb !== 'function') {
    throw TypeError()
  }
  if (this.floraCli == null) {
    return process.nextTick(() => cb(new Error('flora service connect failed')))
  }
  var caps = new floraFactory.Caps()
  caps.write(asr)
  caps.write(asr2nlpId)
  caps.writeInt32(asr2nlpSeq)
  this.asr2nlpCallbacks[asr2nlpSeq++] = cb
  this.floraCli.post('rokid.speech.put_text', caps, floraFactory.MSGTYPE_INSTANT)
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
