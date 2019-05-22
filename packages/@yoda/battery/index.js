'use strict'

/**
 * @module @yoda/battery
 * @description provide the battery state management.
 */

var manifest = require('@yoda/manifest')

/**
 * @returns {boolean} true if device has battery support enabled
 */
function isBatterySupported () {
  return manifest.isCapabilityEnabled('battery')
}

/**
 *
 * @param {object} [options]
 * @param {number} [options.timeout]
 * @returns {object} battery info
 */
function getBatteryInfo (options) {
  if (!isBatterySupported()) {
    return Promise.resolve({ batSupported: false })
  }
  return require('@yoda/flora/disposable').once('battery.info', options)
    .then(msg => {
      var data
      try {
        data = JSON.parse(msg[0])
      } catch (err) {
        throw new Error('Unparsable data received from battery.info')
      }
      return data
    })
}

function getBatteryCharging () {
  if (!isBatterySupported()) {
    return Promise.resolve(false)
  }
  return getBatteryInfo()
    .then(info => {
      return info.batSupported && info.batChargingOnline
    })
}

module.exports.isBatterySupported = isBatterySupported
module.exports.getBatteryInfo = getBatteryInfo
module.exports.getBatteryCharging = getBatteryCharging
