/**
 * @module @yoda/ota/condition
 */

var promisify = require('util').promisify
var property = require('@yoda/property')
var manifest = require('@yoda/manifest')
var battery = require('@yoda/battery')
var fetchOtaInfo = require('./network').fetchOtaInfo

var fetchOtaInfoAsync = promisify(fetchOtaInfo)

module.exports.getAvailabilityOfOta = getAvailabilityOfOta
/**
 *
 * @param {module:@yoda/ota~OtaInfo} upgradeInfo
 * @returns {Promise<true | 'low_power' | 'extremely_low_power' | 'new_version'>}
 */
function getAvailabilityOfOta (upgradeInfo) {
  var localVersion = property.get('ro.build.version.release')
  var future = Promise.resolve(true)
  if (manifest.isCapabilityEnabled('battery')) {
    future = battery.getBatteryInfo()
      .then(info => {
        if (!info.batSupported) {
          return true
        }
        if (info.batLevel < 15) {
          return 'extremely_low_power'
        }
        if (info.batLevel < 50 && !info.batChargingOnline) {
          return 'low_power'
        }
        return true
      })
  }
  return future.then(check => {
    if (check !== true) {
      return check
    }
    return fetchOtaInfoAsync(localVersion)
      .then(info => {
        if (info == null) {
          return 'new_version'
        }
        if (info.version !== upgradeInfo.version) {
          return 'new_version'
        }
        return true
      })
  })
}
