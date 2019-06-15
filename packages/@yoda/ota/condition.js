/**
 * @module @yoda/ota/condition
 */

var manifest = require('@yoda/manifest')
var battery = require('@yoda/battery')

module.exports.getAvailabilityOfOta = getAvailabilityOfOta
/**
 *
 * @param {module:@yoda/ota~OtaInfo} upgradeInfo
 * @returns {Promise<true | 'low_power' | 'extremely_low_power'>}
 */
function getAvailabilityOfOta (upgradeInfo) {
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
    return true
  })
}
