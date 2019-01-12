var promisify = require('util').promisify
var property = require('@yoda/property')
var fetchOtaInfo = require('./network').fetchOtaInfo

var fetchOtaInfoAsync = promisify(fetchOtaInfo)

module.exports.getAvailabilityOfOta = getAvailabilityOfOta
function getAvailabilityOfOta (upgradeInfo) {
  var localVersion = property.get('ro.build.version.release')
  // TODO: battery assertion
  return fetchOtaInfoAsync(localVersion)
    .then(
      info => {
        if (info == null) {
          return false
        }
        if (info.version !== upgradeInfo.version) {
          return false
        }
        return true
      }
    )
}
