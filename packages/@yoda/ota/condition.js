var promisify = require('util').promisify
var property = require('@yoda/property')
var manifest = require('@yoda/manifest')
var battery = require('@yoda/battery')
var fetchOtaInfo = require('./network').fetchOtaInfo

var fetchOtaInfoAsync = promisify(fetchOtaInfo)

module.exports.getAvailabilityOfOta = getAvailabilityOfOta
function getAvailabilityOfOta (upgradeInfo) {
  var localVersion = property.get('ro.build.version.release')
  var future = Promise.resolve(true)
  if (manifest.isCapabilityEnabled('battery')) {
    future = battery.getBatteryInfo()
      .then(info => {
        if (info.batSupported) {
          if (!info.batChargingOnline && info.batLevel < 50) {
            return false
          }
        }
        return true
      })
  }
  return future.then(check => {
    if (!check) {
      return false
    }
    return fetchOtaInfoAsync(localVersion)
      .then(info => {
        if (info == null) {
          return false
        }
        if (info.version !== upgradeInfo.version) {
          return false
        }
        return true
      })
  })
}
