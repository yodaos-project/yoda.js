'use strict'

var device = require('./bind')
var MqttAgent = require('./mqtt')

exports.connect = function () {
  return new Promise((resolve, reject) => {
    device.bindDevice()
      .then((config) => {
        resolve(new MqttAgent(config))
      })
      .catch(reject)
  })
}
