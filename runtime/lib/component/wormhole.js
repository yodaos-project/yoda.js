'use strict'

var logger = require('logger')('wormhole')
var AudioManager = require('@yoda/audio').AudioManager

module.exports = Wormhole
function Wormhole (runtime) {
  this.runtime = runtime
}

Wormhole.prototype.init = function init (mqttcli) {
  logger.info('initialize the wormhole with a new mqtt connection.')
  this.mqtt = mqttcli
  this.mqtt.setMessageHandler((topic, text) => {
    var handler = this.handlers[topic]
    if (typeof handler !== 'function') {
      logger.warn('no handler for ' + topic)
      return
    }
    handler.call(this, text)
  })
}

Wormhole.prototype.handlers = {
  /**
   * @member version
   */
  version: function () {
    return this.sendToApp('version', 'ok')
  },
  /**
   * @member asr
   */
  asr: function (asr) {
    this.runtime.flora.getNlpResult(asr, (err, nlp, action) => {
      if (err) {
        logger.error('occurrs some error in speechT', err)
      } else {
        logger.info('MQTT command: get nlp result for asr', asr, nlp, action)
        this.runtime.onVoiceCommand(asr, nlp, action)
      }
    })
  },
  /**
   * @member cloud_forward
   */
  cloud_forward: function (data) {
    try {
      var msg = JSON.parse(data)
      var params = JSON.parse(msg.content.params)
      this.runtime.onVoiceCommand('', params.nlp, params.action)
    } catch (err) {
      logger.error(err && err.stack)
    }
  },
  /**
   * @member forward
   */
  forward: function (data) {
    this.runtime.onForward(data)
  },
  /**
   * @member get_volume
   */
  get_volume: function () {
    this.updateVolume()
  },
  /**
   * @member set_volume
   */
  set_volume: function (data) {
    var msg = JSON.parse(data)
    if (msg.music !== undefined) {
      this.runtime.openUrl(`yoda-skill://volume/set_volume?value=${msg.music}`, { preemptive: false })
    }
  },
  /**
   * @member sys_update_available
   */
  sys_update_available: function () {
    logger.info('received upgrade command from mqtt, running ota in background.')
    this.runtime.openUrl('yoda-skill://ota/mqtt/check_update', { preemptive: false })
  },
  /**
   * @member reset_settings
   */
  reset_settings: function (data) {
    this.runtime.onResetSettings()
  },
  /**
   * @member custom_config
   */
  custom_config: function (data) {
    this.runtime.onCustomConfig(data)
  },
  /**
   * @member UNIVERSAL_UNBIND
   */
  UNIVERSAL_UNBIND: function (data) {
    this.runtime.unBindDevice(data)
  }
}

Wormhole.prototype.sendToApp = function sendToApp (topic, data) {
  if (this.mqtt == null) {
    logger.info('not logged in and not connected, just skip to send data to app')
    return
  }
  if (typeof data !== 'string' && Buffer.isBuffer(data) === false) {
    data = JSON.stringify(data)
  }
  this.mqtt.sendToApp(topic, data)
  return Promise.resolve()
}

Wormhole.prototype.setOffline = function setOffline () {
  if (this.mqtt == null) {
    return
  }
  logger.info('disconnecting mqtt proactively')
  this.mqtt.suspend()
}

Wormhole.prototype.updateVolume = function updateVolume () {
  var res = {
    type: 'Volume',
    event: 'ON_VOLUME_CHANGE',
    template: JSON.stringify({
      mediaCurrent: AudioManager.getVolume(),
      mediaTotal: 100,
      alarmCurrent: AudioManager.getVolume(AudioManager.STREAM_ALARM),
      alarmTotal: 100
    }),
    appid: ''
  }
  logger.log('on request volume ->', res)
  this.sendToApp('event', res)
}
