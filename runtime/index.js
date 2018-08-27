'use strict'

var Turen = require('turen')
var Adapter = require('./adapter/dbus')
var cloudApi = require('./cloudapi/index')
var property = require('property')
var AudioManager = require('audio').AudioManager
var AppRuntime = require('./appRuntime')
var logger = require('logger')('main')

var CloudGW = require('@yoda/cloudgw')

// ------------------------------------------------------

var runtime = new AppRuntime(['/opt/apps'])

runtime.volume = AudioManager
runtime.adapter = Adapter
runtime.cloudApi = cloudApi

AudioManager.setMute(false)
AudioManager.setVolume(60)

var speech = new Turen.TurenSpeech()
var speechT = require('@yoda/speech')

// 监听代理事件。代理执行turen API
runtime.on('setStack', function (stack) {
  speech.setStack(stack)
  logger.log('setStack ', stack)
})
runtime.on('setPickup', function (isPickup) {
  speech.setPickup(isPickup)
  logger.log('setPickup ', isPickup)
})

speech.on('voice coming', function (event) {
  logger.log('voice coming')
  runtime.onEvent('voice coming', {})
})
speech.on('voice local awake', function (event) {
  logger.log('voice local awake')
  runtime.onEvent('voice local awake', event)
})
speech.on('asr pending', function (asr) {
  logger.log('asr pending', asr)
  runtime.onEvent('asr pending', asr)
})
speech.on('asr end', function (asr, event) {
  logger.log('asr end', asr)
  runtime.onEvent('asr end', {
    asr: asr
  })
})

// if DEBUG, we put raw events
if (process.env.DISPLAY_RAW_EVENT) {
  speech.on('raw event', function (event) {
    logger.log(event)
  })
}

// 监听turen NLP事件
speech.on('nlp', function (response, event) {
  logger.log('nlp', response)
  runtime.onEvent('nlp', response)
})

speech.start()

runtime.on('reconnected', function () {
  logger.log('yoda reconnected')
  // 登录、绑定、注册mqtt
  cloudApi.connect().then((mqttAgent) => {
    // 系统配置文件
    var config = mqttAgent.config
    var options = {
      host: config.host,
      port: config.port,
      key: config.key,
      secret: config.secret,
      deviceTypeId: config.device_type_id,
      deviceId: config.device_id
    }
    speech.start(options)
    speechT.start(options)
    require('@yoda/ota/network').cloudgw = new CloudGW(options)

    // Implementation interface
    runtime.onGetPropAll = function () {
      var masterId = property.get('persist.system.user.userId')
      return {
        masterId: masterId,
        host: config.host,
        port: config.port,
        key: config.key,
        secret: config.secret,
        deviceTypeId: config.device_type_id,
        deviceId: config.device_id
      }
    }

    runtime.onReLogin()

    mqttAgent.on('asr', function (asr) {
      speechT.getNlpResult(asr, function (err, nlp, action) {
        if (err) {
          console.error(`occurrs some error in speechT`)
        } else {
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
          mediaCurrent: '' + AudioManager.getVolume(AudioManager.STREAM_AUDIO),
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
        AudioManager.setVolume('audio', msg.music)
      }
      var res = {
        type: 'Volume',
        event: 'ON_VOLUME_CHANGE',
        template: JSON.stringify({
          mediaCurrent: '' + AudioManager.getVolume(AudioManager.STREAM_AUDIO),
          mediaTotal: '100',
          alarmCurrent: '' + AudioManager.getVolume(AudioManager.STREAM_ALARM),
          alarmTotal: '100'
        }),
        appid: ''
      }
      logger.log('response topic set_volume ->', res)
      mqttAgent.sendToApp('event', JSON.stringify(res))
    })
  }).catch((err) => {
    logger.error(err)
  })
})

// var netStatus = wifi.getNetworkState();
// if (netStatus === 3) {
//   runtime.onEvent('disconnected', {});
// }
