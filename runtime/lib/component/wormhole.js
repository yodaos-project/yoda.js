'use strict'

var logger = require('logger')('wormhole')
var AudioManager = require('@yoda/audio').AudioManager

module.exports = Wormhole
function Wormhole (runtime) {
  this.runtime = runtime
}

Wormhole.prototype.init = function init (mqttClient) {
  logger.info('initialize the wormhole with a new mqtt connection.')
  this.mqtt = mqttClient
  this.mqtt.on('message', this.onMessage.bind(this))
}

Wormhole.prototype.handlers = {
  asr: function (asr) {
    this.runtime.flora.getNlpResult(asr, (err, nlp, action) => {
      if (err) {
        console.error(`occurrs some error in speechT`)
      } else {
        logger.info('MQTT command: get nlp result for asr', asr, nlp, action)
        this.runtime.onVoiceCommand(asr, nlp, action)
      }
    })
  },
  cloud_forward: function (data) {
    this.runtime.onCloudForward(data)
  },
  forward: function (data) {
    this.runtime.onForward(data)
  },
  get_volume: function (data) {
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
    this.sendToApp('event', res)
  },
  set_volume: function (data) {
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
    this.sendToApp('event', res)
  },
  sys_update_available: function () {
    logger.info('received upgrade command from mqtt, running ota in background.')
    this.runtime.openUrl('yoda-skill://ota/mqtt/check_update', { preemptive: false })
  },
  reset_settings: function (data) {
    this.runtime.onResetSettings()
  },
  custom_config: function (data) {
    this.runtime.onCustomConfig(data)
  },
  UNIVERSAL_UNBIND: function (data) {
    this.runtime.unBindDevice(data)
  }
}

Wormhole.prototype.onMessage = function onMessage (topic, text) {
  var handler = this.handlers[topic]
  if (typeof handler !== 'function') {
    return
  }
  handler.call(this, text)
}

Wormhole.prototype.sendToApp = function sendToApp (topic, data) {
  if (this.mqtt == null) {
    return Promise.reject(new Error('MQTT not ready'))
  }
  return Promise.resolve()
    .then(() => this.mqtt.sendToApp(topic, JSON.stringify(data)))
}

Wormhole.prototype.setOffline = function setOffline () {
  if (this.mqtt == null) {
    return
  }
  logger.info('disconnecting mqtt proactively')
  this.mqtt.disconnect()
}
