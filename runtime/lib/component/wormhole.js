var logger = require('logger')('wormhole')

var AudioManager = require('@yoda/audio').AudioManager
var ota = require('@yoda/ota')

module.exports = Wormhole
function Wormhole (runtime) {
  this.runtime = runtime
}

Wormhole.prototype.init = function init (mqttClient) {
  this.mqtt = mqttClient
  this.mqtt.on('message', this.onMessage.bind(this))
}

Wormhole.prototype.handlers = {
  asr: function (asr) {
    this.runtime.getNlpResult(asr, function (err, nlp, action) {
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
    ota.runInBackground()
  },
  custom_config: function (data) {
    this.runtime.onCustomConfig(data)
  }
}

Wormhole.prototype.onMessage = function onMessage (topic, text) {
  var handler = this.handlers[topic]
  if (typeof handler !== 'function') {
    return
  }
  handler(text)
}

Wormhole.prototype.sendToApp = function sendToApp (topic, data) {
  if (this.mqtt == null) {
    return Promise.reject(new Error('MQTT not ready'))
  }
  this.mqtt.sendToApp(topic, JSON.stringify(data))
  return Promise.resolve()
}
