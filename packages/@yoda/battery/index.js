'use strict'

/**
 * @module @yoda/battery
 * @description provide the battery state management.
 */

var floraDisposable = require('@yoda/flora/disposable')

/**
 *
 * @param {object} [options]
 * @param {number} [options.timeout]
 * @returns {object} battery info
 */
function getBatteryInfo (options) {
  return floraDisposable.once('battery.info', options)
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

module.exports.getBatteryInfo = getBatteryInfo
