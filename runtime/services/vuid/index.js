'use strict'

var cloudApi = require('../../lib/cloudapi')
var property = require('@yoda/property')
var TurenSpeech = require('turen').TurenSpeech
var AudioManager = require('@yoda/audio').AudioManager
var AppRuntime = require('../../lib/app-runtime')
var CloudGW = require('@yoda/cloudgw')
var logger = require('logger')('main')
var ota = require('@yoda/ota')

var speechT = require('@yoda/speech')
var speechV = new TurenSpeech()
speechV.start()
speechV.on('ready', entry)

;(function init () {
  // if DEBUG, we put raw events
  if (process.env.DISPLAY_RAW_EVENT) {
    speechV.on('raw event', function (event) {
      logger.log(event)
    })
  }
  AudioManager.setMute(false)
  AudioManager.setVolume(60)
})()

function entry () {
  console.log('ready')
  var runtime = new AppRuntime(['/opt/apps'])
  runtime.cloudApi = cloudApi
  runtime.volume = AudioManager
  runtime.speechT = speechT

  runtime.on('setStack', function onSetStack (stack) {
    logger.log('setStack ', stack)
    speechV.setStack(stack)
  })
  runtime.on('setPickup', function onSetPickup (isPickup) {
    logger.log('setPickup ', isPickup)
    speechV.setPickup(isPickup)
  })
  runtime.on('micMute', function onMicMute (mute) {
    if (mute) {
      speechV.pause()
      return
    }
    speechV.resume()
  })
  speechV.on('voice coming', function onVoiceComing (event) {
    logger.log('voice coming')
    runtime.onEvent('voice coming', {})
  })
  speechV.on('voice local awake', function onVoiceAwake (event) {
    logger.log('voice local awake')
    runtime.onEvent('voice local awake', event)
  })
  speechV.on('asr pending', function onAsrPending (asr) {
    logger.log(`asr pending ${asr}`)
    runtime.onEvent('asr pending', asr)
  })
  speechV.on('asr end', function onAsrComplete (asr, event) {
    logger.log(`asr end ${asr}`)
    runtime.onEvent('asr end', {
      asr: asr
    })
  })
  speechV.on('nlp', function (response, event) {
    logger.log('nlp', response)
    runtime.onEvent('nlp', response)
  })

  function cloudEvent (code, msg) {
    runtime.onEvent('cloud event', {
      code: code,
      msg: msg
    })
  }

  runtime.on('reconnected', function () {
    logger.log('yoda reconnected')

    // login -> bind -> mqtt
    cloudApi.connect(cloudEvent).then((mqttAgent) => {
      // load the system configuration
      var config = mqttAgent.config
      var options = {
        host: config.host,
        port: config.port,
        key: config.key,
        secret: config.secret,
        deviceTypeId: config.deviceTypeId,
        deviceId: config.deviceId
      }
      speechV.start(options)
      speechT.start(options)
      require('@yoda/ota/network').cloudgw = new CloudGW(options)

      // implementation interface
      runtime.onGetPropAll = function () {
        var masterId = property.get('persist.system.user.userId')
        return {
          masterId: masterId,
          host: config.host,
          port: config.port,
          key: config.key,
          secret: config.secret,
          deviceTypeId: config.deviceTypeId,
          deviceId: config.deviceId
        }
      }
      runtime.onReLogin()

      mqttAgent.on('asr', function (asr) {
        speechT.getNlpResult(asr, function (err, nlp, action) {
          if (err) {
            console.error(`occurrs some error in speechT`)
          } else {
            logger.info('MQTT command: get nlp result for asr', asr, nlp, action)
            runtime.onVoiceCommand(asr, nlp, action)
          }
        })
      })
      mqttAgent.on('cloud_forward', function (data) {
        runtime.onCloudForward(data)
      })
      mqttAgent.on('get_volume', function (data) {
        var res = {
          type: 'Volume',
          event: 'ON_VOLUME_CHANGE',
          template: JSON.stringify({
            mediaCurrent: '' + AudioManager.getVolume(),
            mediaTotal: '100',
            alarmCurrent: '' + AudioManager.getVolume(AudioManager.STREAM_ALARM),
            alarmTotal: '100'
          }),
          appid: ''
        }
        logger.log('response topic get_volume ->', res)
        mqttAgent.sendToApp('event', JSON.stringify(res))
      })
      mqttAgent.on('set_volume', function (data) {
        var msg = JSON.parse(data)
        if (msg.music !== undefined) {
          AudioManager.setVolume(msg.music)
        }
        var res = {
          type: 'Volume',
          event: 'ON_VOLUME_CHANGE',
          template: JSON.stringify({
            mediaCurrent: '' + AudioManager.getVolume(),
            mediaTotal: '100',
            alarmCurrent: '' + AudioManager.getVolume(AudioManager.STREAM_ALARM),
            alarmTotal: '100'
          }),
          appid: ''
        }
        logger.log('response topic set_volume ->', res)
        mqttAgent.sendToApp('event', JSON.stringify(res))
      })
      mqttAgent.on('sys_update_available', () => {
        logger.info('received upgrade command from mqtt, running ota in background.')
        ota.runInBackground()
      })
    }).catch((err) => {
      logger.error('initializing occurrs error', err && err.stack)
    })
  })
}
