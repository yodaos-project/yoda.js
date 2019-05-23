'use strict'

/**
 * @module @yoda/ota
 */

/**
 * @callback OtaInfoCallback
 * @param {Error} error
 * @param {module:@yoda/ota~OtaInfo} info
 */

var fs = require('fs')
var path = require('path')

var system = require('@yoda/system')
var property = require('@yoda/property')
var logger = require('logger')('ota')

var lock = require('./lock')
var persistance = require('./persistance')
var constants = require('./const')

var systemVersionProp = 'ro.build.version.release'

/**
 * @private
 * @param {string[]} files
 * @param {Function} callback
 */
function unlinkFiles (files, callback) {
  if (files.length === 0) {
    process.nextTick(callback)
    return
  }
  fs.unlink(files[0], function onUnlink (err) {
    if (err) {
      return callback(err)
    }
    unlinkFiles(files.slice(1), callback)
  }) /** fs.unlink */
}

/**
 * Clean downloaded images.
 *
 * @private
 * @param {Function} callback
 */
module.exports.cleanImages = cleanImages
function cleanImages (callback) {
  fs.readdir(constants.upgradeDir, function onReaddir (err, files) {
    if (err) {
      return callback(err)
    }
    files = files
      .filter(it => {
        var extname = path.extname(it)
        return extname === '.img'
      })
      .map(it => path.join(constants.upgradeDir, it))

    unlinkFiles(files, callback)
  }) /** fs.readdir */
}

/**
 *
 * @param {Function} callback
 */
module.exports.cleanup = cleanup
function cleanup (callback) {
  fs.unlink(constants.infoFile, function onUnlink () {
    /** ignore any error */
    cleanImages(callback)
  })
}

/**
 * Reset Ota status to prevent system updates on reboot.
 * Also clears OTA infos and images stored on disk on next tick.
 * @private
 * @param {Function} callback
 */
module.exports.resetOta = resetOta
function resetOta (callback) {
  var ret = system.prepareOta('')
  if (ret !== 0) {
    throw new Error(`set_recovery_cmd_status(${ret})`)
  }
  lock(constants.procLock, function onProcLocked (err, unlock) {
    if (err) {
      logger.error('ota is running, terminating reset.')
      return callback(null, ret)
    }
    cleanup(() => unlock(callback))
  }) /** END: lockInfo */
}

/**
 * Check if it is the first boot after an upgrade, return ota info if is, null otherwise.
 *
 * @param {module:@yoda/ota~OtaInfoCallback} callback
 */
module.exports.getInfoIfFirstUpgradedBoot = getInfoIfFirstUpgradedBoot
function getInfoIfFirstUpgradedBoot (callback) {
  var localVersion = property.get(systemVersionProp)
  persistance.readInfo(function onInfo (err, info) {
    if (err) {
      logger.error(`read info failed`, err.message, err.stack)
      callback(null, null)
      return
    }
    logger.info(`local info version ${info && info.version}`)
    if (info && (info.version === localVersion)) {
      callback(null, info)
      return
    }
    callback(null, null)
  })
}

/**
 * Check if there is a pending update, return ota info if is, null otherwise.
 *
 * @param {module:@yoda/ota~OtaInfoCallback} callback
 */
module.exports.getInfoOfPendingUpgrade = getInfoOfPendingUpgrade
function getInfoOfPendingUpgrade (callback) {
  persistance.readInfo(function onInfo (err, info) {
    if (err) {
      logger.error(`read info failed`, err.message, err.stack)
      callback(null, null)
      return
    }
    if (info && (info.status === 'downloaded')) {
      callback(null, info)
      return
    }
    callback(null, null)
  })
}

/**
 * Get download progress of given info.
 * @param {module:@yoda/ota~OtaInfo} info
 * @param {Function} callback
 */
module.exports.getImageDownloadProgress = getImageDownloadProgress
function getImageDownloadProgress (info, callback) {
  var imgPath = persistance.getImagePath(info)
  fs.stat(imgPath, (err, stat) => {
    if (err) {
      return callback(err)
    }
    callback(null, stat.size / info.totalSize)
  }) /** fs.stat */
}

module.exports.condition = require('./condition')
