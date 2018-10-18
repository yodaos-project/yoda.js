'use strict'

var os = require('os')
var property = require('@yoda/property')
var _ = require('@yoda/util')._
var logger = require('logger')('cloudapi')

var device = require('./bind')
var MqttAgent = require('./mqtt')
var confirm = require('./confirm')
var CONFIG = null

/**
 * @function connect
 * @param {function} notify - the notify function which will be called in some events.
 * @returns {Promise}
 */
exports.connect = function (notify) {
  return device.bindDevice(notify)
    .then((config) => {
      CONFIG = Object.assign({}, config)
      return new MqttAgent(config)
    })
}

/**
 * Send the confirm request from device-side.
 * @function sendConfirm
 * @param {string} appId
 * @param {string} intent
 * @param {string} slot
 * @param {string} options
 * @param {string} attrs
 * @param {function} callback
 * @returns {Promise}
 */
exports.sendConfirm = function sendConfirm (appId, intent, slot, options, attrs, callback) {
  return confirm(appId, intent, slot, options, attrs, CONFIG, callback)
}

/**
 * Updates the basic information.
 * @function updateBasicInfo
 * @param {object} cloudgw
 * @param {object} info
 * @returns {Promise<object>}
 */
exports.updateBasicInfo = function updateBasicInfo (cloudgw, info) {
  var networkInterface = _.get(os.networkInterfaces(), 'wlan0', [])
    .filter(it => _.get(it, 'family') === 'IPv4')[0]
  info = Object.assign({}, info, {
    device_id: property.get('ro.boot.serialno'),
    device_type_id: property.get('ro.boot.devicetypeid'),
    ota: property.get('ro.build.version.release'),
    mac: _.get(networkInterface, 'mac'),
    lan_ip: _.get(networkInterface, 'address')
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

/**
 * Resets the settings.
 * @function resetSettings
 * @param {object} cloudgw
 * @returns {Promise<object>}
 */
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

/**
 * Unbind the devices.
 * @function unBindDevice
 * @returns {Promise<object>}
 */
exports.unBindDevice = function () {
  return device.unBindDevice()
    .catch((err) => {
      logger.debug('unBindDevice failed', err)
    })
}
