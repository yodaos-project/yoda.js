var fs = require('fs')
var lock = require('./lock')
var constants = require('./const')

module.exports.getImagePath = getImagePath
module.exports.readInfo = readInfo
module.exports.writeInfo = writeInfo

function getImagePath (info) {
  return `${constants.upgradeDir}/${info.version}.img`
}

/**
 * Read local info file.
 * @private
 * @param {OtaInfoCallback} callback
 */
function readInfo (callback) {
  fs.stat(constants.infoFile, function onStat (err) {
    if (err) {
      if (err.code === 'ENOENT') {
        return callback(null, null)
      }
      return callback(err)
    }
    fs.readFile(constants.infoFile, 'utf8', function onRead (err, data) {
      if (err) {
        return callback(err)
      }

      var info
      try {
        info = JSON.parse(data)
      } catch (err) {
        return callback(null, null)
      }
      return callback(null, info)
    }) /** END: fs.readFile */
  }) /** END: fs.stat */
}

/**
 * Write ota info to local disk.
 *
 * @private
 * @param {OtaInfo} info
 * @param {Function} callback
 */
function writeInfo (info, callback) {
  lock(constants.infoLock, function onInfoLocked (err, unlock) {
    if (err) {
      return callback(err)
    }

    var data = JSON.stringify(info)
    fs.writeFile(constants.infoFile, data, function onWriteFile (err) {
      if (err) {
        return unlock(function onUnlock () {
          callback(err)
        })
      }
      unlock(function onUnlock () {
        callback(null)
      })
    }) /** END: fs.writeFile */
  }) /** END: lockInfo */
}
