'use strict'

var device = require('./bind')
var MqttAgent = require('./mqtt')
var sendConfirm = require('./sendConfirm')
var CONFIG = null

exports.connect = function (onEvent) {
  return device.bindDevice(onEvent)
    .then((config) => {
      CONFIG = Object.assign({}, config)
      return new MqttAgent(config)
    })
}

exports.sendConfirm = function (appId, intent, slot, options, attrs, callback) {
  sendConfirm(appId, intent, slot, options, attrs, CONFIG, callback)
}
