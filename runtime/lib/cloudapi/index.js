'use strict'

var os = require('os')
var property = require('@yoda/property')
var _ = require('@yoda/util')._

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

exports.updateBasicInfo = function updateBasicInfo (cloudgw, info) {
  var networkInterface = _.get(os.networkInterfaces(), 'wlan0', [])
    .filter(it => _.get(it, 'family') === 'IPv4')[0]
  info = Object.assign({}, info, {
    ota: property.get('ro.build.version.release'),
    ip: _.get(networkInterface, 'address'),
    mac: _.get(networkInterface, 'mac')
  })
  return new Promise((resolve, reject) => {
    cloudgw.request('/v1/device/deviceManager/addOrUpdateDeviceInfo',
      { namespace: 'basic_info', values: info },
      (err, data) => {
        if (err) {
          return reject(err)
        }
        resolve(data)
      })
  })
}

exports.resetSettings = function resetSettings (cloudgw) {
  return new Promise((resolve, reject) => {
    cloudgw.request('/v1/device/deviceManager/resetRoki', {},
      (err, data) => {
        if (err) {
          return reject(err)
        }
        resolve(data)
      })
  })
}
