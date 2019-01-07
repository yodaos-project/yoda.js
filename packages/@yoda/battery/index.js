'use strict'

/**
 * @module @yoda/battery
 * @description provide the battery state management.
 */

var floraDisposable = require('@yoda/flora/disposable')

function getBatteryInfo (options) {
  return floraDisposable.once('battery.info', options)
}

module.exports.getBatteryInfo = getBatteryInfo
