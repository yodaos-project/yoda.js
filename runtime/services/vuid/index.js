'use strict'

var logger = require('logger')('main')

require('@yoda/oh-my-little-pony').catchUncaughtError('/data/system/yodart-err.log')
var property = require('@yoda/property')
var CloudGW = require('@yoda/cloudgw')
var floraFactory = require('@yoda/flora')
var _ = require('@yoda/util')._

var globalEnv = require('../../lib/env')()
var cloudApi = require('../../lib/cloudapi')
var AppRuntime = require('../../lib/app-runtime')
var floraConfig = require('../../flora-config.json')

var floraCli
var speechAuthInfo
var floraMsgHandlers = {}

;(function init () {
  // if DEBUG, we put raw events
  activateProcess()
  initFloraClient()
  entry()
})()

function activateProcess () {
  // currently this is a workaround for nextTick missing.
  setInterval(() => false, 1000)
}

function initFloraClient () {
  logger.info('start initializing flora client')
  var cli = floraFactory.connect(floraConfig.uri + '#vui', floraConfig.bufsize)
  if (!cli) {
    logger.log('flora connect failed, try again after', floraConfig.reconnInterval, 'milliseconds')
    setTimeout(initFloraClient, floraConfig.reconnInterval)
    return
  }
  cli.on('recv_post', function (name, type, msg) {
    var cb = floraMsgHandlers[name]
    if (cb) {
      cb(msg)
    }
  })
  cli.on('disconnected', function () {
    logger.log('flora disconnected, try reconnect')
    floraCli.close()
    initFloraClient()
  })
  cli.subscribe('rokid.turen.voice_coming', floraFactory.MSGTYPE_INSTANT)
  cli.subscribe('rokid.turen.local_awake', floraFactory.MSGTYPE_INSTANT)
  cli.subscribe('rokid.speech.extra', floraFactory.MSGTYPE_INSTANT)
  cli.subscribe('rokid.speech.inter_asr', floraFactory.MSGTYPE_INSTANT)
  cli.subscribe('rokid.speech.final_asr', floraFactory.MSGTYPE_INSTANT)
  cli.subscribe('rokid.speech.nlp', floraFactory.MSGTYPE_INSTANT)
  cli.subscribe('rokid.speech.error', floraFactory.MSGTYPE_INSTANT)

  updateSpeechPrepareOptions()

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
  cli.post('rokid.speech.options', msg, floraFactory.MSGTYPE_PERSIST)
  floraCli = cli
}

function updateSpeechPrepareOptions () {
  if (floraCli && speechAuthInfo) {
    var uri = 'wss://apigwws.open.rokid.com:443/api'
    var msg = new floraFactory.Caps()
    if (speechAuthInfo.uri) { uri = speechAuthInfo.uri }
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
    floraCli.post('rokid.speech.prepare_options', msg, floraFactory.MSGTYPE_PERSIST)
  }
}

function updateStack (stack) {
  if (floraCli) {
    var msg = new floraFactory.Caps()
    msg.write(stack)
    floraCli.post('rokid.speech.stack', msg, floraFactory.MSGTYPE_PERSIST)
  }
}

function turenPickup (isPickup) {
  if (floraCli) {
    var msg = new floraFactory.Caps()
    msg.writeInt32(isPickup ? 1 : 0)
    floraCli.post('rokid.turen.pickup', msg, floraFactory.MSGTYPE_INSTANT)
  }
}

function turenMute (mute) {
  if (floraCli) {
    var msg = new floraFactory.Caps()
    msg.writeInt32(mute ? 0 : 1)
    floraCli.post('rokid.turen.mute', msg, floraFactory.MSGTYPE_INSTANT)
  }
}

function entry () {
  logger.debug('vui is ready')

  var voiceCtx = { lastFaked: false }
  var runtime = new AppRuntime()
  runtime.cloudApi = cloudApi
  runtime.init(['/opt/apps'])

  runtime.on('setStack', function onSetStack (stack) {
    logger.log(`setStack ${stack}`)
    updateStack(stack)
  })
  runtime.on('setPickup', function onSetPickup (isPickup) {
    logger.log(`start pickup ${isPickup}`)
    turenPickup(isPickup)
  })
  runtime.on('micMute', function onMicMute (mute) {
    turenMute(mute)
  })
  floraMsgHandlers['rokid.turen.voice_coming'] = function (msg) {
    logger.log('voice coming')
    voiceCtx.lastFaked = false
    runtime.onTurenEvent('voice coming', {})
  }
  floraMsgHandlers['rokid.turen.local_awake'] = function (msg) {
    logger.log('voice local awake')
    var data = {}
    data.sl = msg.get(0)
    runtime.onTurenEvent('voice local awake', data)
  }
  floraMsgHandlers['rokid.speech.inter_asr'] = function (msg) {
    var asr = msg.get(0)
    logger.log('asr pending', asr)
    runtime.onTurenEvent('asr pending', asr)
  }
  floraMsgHandlers['rokid.speech.final_asr'] = function (msg) {
    var asr = msg.get(0)
    logger.log('asr end', asr)
    runtime.onTurenEvent('asr end', { asr: asr })
  }
  floraMsgHandlers['rokid.speech.extra'] = function (msg) {
    var data = JSON.parse(msg.get(0))
    if (data.activation === 'fake') {
      voiceCtx.lastFaked = true
      runtime.onTurenEvent('asr fake')
    }
  }
  floraMsgHandlers['rokid.speech.nlp'] = function (msg) {
    if (voiceCtx.lastFaked) {
      logger.info('skip nlp, because last voice is fake')
      voiceCtx.lastFaked = false
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
    runtime.onTurenEvent('nlp', data)
  }
  floraMsgHandlers['rokid.speech.error'] = function (msg) {
  }

  runtime.on('reconnected', function () {
    logger.log('yoda reconnected')

    // login -> mqtt
    cloudApi.connect((code, msg) => {
      runtime.handleCloudEvent({
        code: code,
        msg: msg
      })
    }).then((mqttAgent) => {
      // load the system configuration
      var config = mqttAgent.config
      var options = {
        uri: globalEnv.speechUri,
        key: config.key,
        secret: config.secret,
        deviceTypeId: config.deviceTypeId,
        deviceId: config.deviceId
      }
      var cloudgw = new CloudGW(options)
      require('@yoda/ota/network').cloudgw = cloudgw
      cloudApi.updateBasicInfo(cloudgw)
        .catch(err => {
          logger.error('Unexpected error on updating basic info', err.stack)
        })
      speechAuthInfo = options
      updateSpeechPrepareOptions()

      // implementation interface
      var props = Object.assign({}, config, {
        masterId: property.get('persist.system.user.userId')
      })
      runtime.onGetPropAll = () => props
      runtime.doLogin()
      runtime.wormhole.init(mqttAgent)
      runtime.onLoadCustomConfig(_.get(config, 'extraInfo.custom_config', ''))
    }).catch((err) => {
      logger.error('initializing occurrs error', err && err.stack)
    })
  })
}
