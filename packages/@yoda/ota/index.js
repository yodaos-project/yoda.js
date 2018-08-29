'use strict'

/**
 * @module @yoda/ota
 */

/**
 * @typedef {Object} OtaInfo
 * @property {string} imageUrl - fetched from cloudgw
 * @property {string} authorize - fetched from cloudgw
 * @property {string} changelog - fetched from cloudgw
 * @property {string} checksum - fetched from cloudgw
 * @property {boolean} isForceUpdate - fetched from cloudgw
 * @property {string} version - fetched from cloudgw
 * @property {string} imagePath - generated field
 * @property {string} status - generated field, enum for `downloaded`, `downloading`
 */

/**
 * @callback OtaInfoCallback
 * @param {Error} error
 * @param {module:@yoda/ota~OtaInfo} info
 */

var fs = require('fs')
var path = require('path')
var crypto = require('crypto')
var childProcess = require('child_process')

var yodaUtil = require('@yoda/util')
var lockfile = require('lockfile')
var system = require('@yoda/system')
var property = require('@yoda/property')
var logger = require('logger')('ota')

var otaNetwork = require('./network')

var compose = yodaUtil.compose

var upgradeDir = '/data/upgrade'
var procLock = upgradeDir + '/proc.lock'
var infoLock = upgradeDir + '/info.lock'
var infoFile = upgradeDir + '/info.json'
var systemVersionProp = 'ro.build.version.release'

/**
 * @private
 * @param {string} dir
 * @param {Function} callback
 */
function mkdirp (dir, callback) {
  fs.mkdir(dir, function onMkdir (err) {
    if (err == null) {
      return callback(null)
    }
    if (err.code === 'ENOENT') {
      mkdirp(path.dirname(dir), function onMkdirp (err) {
        if (err) {
          return callback(err)
        }
        mkdirp(dir, callback)
      }) /** mkdirp */
      return
    }
    fs.stat(dir, function onStat (err, stat) {
      if (err) {
        return callback(err)
      }
      if (!stat.isDirectory()) {
        var eexist = new Error('Path exists')
        eexist.path = dir
        eexist.code = 'EEXIST'
        return callback(eexist)
      }
      return callback(null)
    }) /** fs.stat */
  }) /** fs.mkdir */
}

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

function getImagePath (info) {
  return `${upgradeDir}/${info.checksum}.img`
}

/**
 * @private
 * @callback lockCallback
 * @param {err} error
 * @param {Function} unlock
 */

/**
 * Lock info file lock.
 * @private
 * @param {module:@yoda/ota~lockCallback} callback
 */
function lockInfo (callback) {
  mkdirp(upgradeDir, function onMkdirp (err) {
    if (err) callback(err)
    lockfile.lock(infoLock, { stale: 60 * 1000 }, function onLock (err) {
      if (err) {
        return callback(err)
      }
      callback(null, unlock)
    })

    function unlock (unlockCallback) {
      lockfile.unlock(infoLock, unlockCallback)
    }
  }) /** mkdirp */
}

/**
 * Read local info file.
 * @private
 * @param {module:@yoda/ota~OtaInfoCallback} callback
 */
function readInfo (callback) {
  fs.stat(infoFile, function onStat (err) {
    if (err) {
      if (err.code === 'ENOENT') {
        return callback(null, null)
      }
      return callback(err)
    }

    var info
    try {
      info = require(infoFile)
    } catch (err) {
      return callback(err)
    }
    return callback(null, info)
  }) /** END: fs.stat */
}

/**
 * Read local info file and remove it.
 *
 * Commonly used to check if it is first boot after upgrade.
 * @private
 * @param {module:@yoda/ota~OtaInfoCallback} callback
 */
function readInfoAndClear (callback) {
  readInfo(function onRead (err, info) {
    if (err) {
      return callback(err)
    }
    if (info == null) {
      callback(null, null)
    }
    fs.unlink(infoFile, () => {
      /** ignore unlink error */
      callback(null, info)
    }) /** fs.unlink */
  }) /** readInfo */
}

/**
 * Write ota info to local disk.
 *
 * @private
 * @param {module:@yoda/ota~OtaInfo} info
 * @param {Function} callback
 */
function writeInfo (info, callback) {
  lockInfo(function onInfoLocked (err, unlock) {
    if (err) {
      return callback(err)
    }

    var data = JSON.stringify(info)
    fs.writeFile(infoFile, data, function onWriteFile (err) {
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

/**
 * Reset Ota status to prevent system updates on reboot.
 * Also clears OTA infos and images stored on disk on next tick.
 * @private
 * @param {Function} callback
 */
function resetOta (callback) {
  var ret = system.prepareOta('')
  if (ret !== 0) {
    throw new Error(`set_recovery_cmd_status(${ret})`)
  }
  lockInfo(function onInfoLocked (err, unlock) {
    if (err) {
      logger.error('ota is running, terminating reset.')
      return callback(null, ret)
    }

    fs.unlink(infoFile, function onUnlink () {
      /** ignore any error */
      cleanImages(function onCleanImages () {
        unlock(callback)
      })
    })
  }) /** END: lockInfo */
}

/**
 * Clean downloaded images.
 *
 * @private
 * @param {Function} callback
 */
function cleanImages (callback) {
  fs.readdir(upgradeDir, function onReaddir (err, files) {
    if (err) {
      return callback(err)
    }
    files = files
      .filter(it => {
        var extname = path.extname(it)
        return extname === '.img' || extname === 'json'
      })
      .map(it => path.join(upgradeDir, it))

    unlinkFiles(files, callback)
  }) /** fs.readdir */
}

/**
 * calculate md5 hash of given file.
 *
 * @private
 * @param {string} file - file path
 * @param {Function} callback - a callback with hash string as second argument
 */
function calculateFileHash (file, callback) {
  var hash = crypto.createHash('md5')
  var stream = fs.createReadStream(file)
  stream.on('data', function onStreamData (data) {
    hash.update(data)
  })
  stream.on('error', function onStreamError (err) {
    callback(err)
  })
  stream.on('end', function onStreamEnd () {
    callback(null, hash.digest('hex'))
  })
}

/**
 * Calculate if there is available disk space left for pending image to be downloaded.
 *
 * @private
 * @param {number} imageSize - expected image size
 * @param {string} destPath - image path to be downloaded to
 * @param {Function} callback
 */
function checkDiskAvailability (imageSize, destPath, callback) {
  fs.stat(destPath, function onStat (err, stat) {
    var downloadedSize
    if (err) {
      if (err.code !== 'ENOENT') {
        return callback(err)
      }
      downloadedSize = 0
    } else {
      downloadedSize = stat.size
    }
    var diskUsage = system.diskUsage(upgradeDir)
    var left = diskUsage.available - imageSize + downloadedSize
    if (left < 5 * 1024 * 1024) {
      /**
       * no space left for new image, try remove existed images
       * TODO: monkey army, remove arbitrary low prioritized files
       */
      return fs.readdir(upgradeDir, (_, files) => {
        if (files && files.length) {
          files = files.filter(it => path.extname(it) === '.img')
          if (files.length) {
            return cleanImages(() => checkDiskAvailability(imageSize, destPath, callback))
          }
        }
        callback(new Error(
          `Disk space not available for new ota image, expect ${imageSize}, got ${diskUsage.available}`))
      })
    }
    callback(null, true)
  }) /** fs.stat */
}

/**
 * Downloads OTA image and check file validity. Also updates local OTA info status on disk.
 *
 * @private
 * @param {module:@yoda/ota~OtaInfo} info
 * @param {Function} callback
 */
function downloadImage (info, callback) {
  var dest = getImagePath(info)
  compose([
    cb => otaNetwork.fetchImageSize(info.imageUrl, cb),
    (cb, imageSize) => checkDiskAvailability(imageSize, dest, cb),
    cb => {
      info.status = 'downloading'
      writeInfo(info, cb)
    },
    cb => otaNetwork.doDownloadImage(info.imageUrl, dest, { noCheckCertificate: true }, cb),
    cb => {
      info.status = 'downloaded'
      writeInfo(info, cb)
    },
    cb => calculateFileHash(dest, cb),
    (cb, hash) => {
      if (hash !== info.checksum) {
        return cb(new Error('Downloaded OTA image checksum validation failed' +
          `expect ${info.checksum}, got ${hash}`))
      }
      cb(null, true)
    }
  ], callback)
}

/**
 * Run OTA procedure in current process context.
 *
 * 0. check if prop 'persist.sys.rokid.noota' is set to truthy value
 * 1. lock program to prevent from concurrent multiple OTA processes;
 * 2. make working directory;
 * 3. fetch OTA info;
 * 4. check if new version available;
 * 5. check if local pending update exists;
 * 6. check if local image exists;
 *   - if image exists:
 *     - if image hash matches, exit 0;
 *     - if image hash does not match, download image;
 *   - if image not exists, download image;
 * 7. write download status to info file on local disk.
 *
 * @param {module:@yoda/ota~OtaInfoCallback} callback
 */
function runInCurrentContext (callback) {
  var noOta = property.get('persist.sys.rokid.noota')
  /** value is truthy */
  if (noOta) {
    return callback(null, null)
  }

  lockfile.lock(procLock, { stale: /** 30m */ 30 * 60 * 1000 }, function onLocked (err) {
    if (err) {
      return callback(err)
    }

    var localVersion = property.get(systemVersionProp)
    var info
    var destPath
    compose([
      /** make work dir */
      cb => mkdirp(upgradeDir, cb),
      /**
       * get new version info if available
       * @returns {module:@yoda/ota~OtaInfo}
       */
      cb => otaNetwork.fetchOtaInfo(localVersion, cb),
      /**
       * @returns {boolean} if target image exists
       */
      (cb, nfo) => {
        info = nfo
        logger.info('got ota info', JSON.stringify(nfo))
        if (info.code === 'NO_IMAGE' || !info.version) {
          /** no available updates */
          return compose.Break(false)
        }
        /** check if local pending update exists */
        readInfo(cb)
      },
      (cb, localInfo) => {
        /**
         * new updates may be over the air whilst local pending update not installed yet.
         * discard pending updates to prevent corruptions.
         */
        if (localInfo) {
          if (localInfo.version !== info.version || localInfo.checksum !== info.checksum) {
            return compose([
              resetOta,
              writeInfo.bind(null, info)
            ], cb)
          }
        }
        writeInfo(info, cb)
      },
      cb => {
        destPath = getImagePath(info)
        info.imagePath = destPath
        /** check if target path exists */
        fs.stat(destPath, function onStat (err, stat) {
          logger.info('check if target path exists', stat != null)
          if (err) {
            if (err.code === 'ENOENT') {
              return cb(null, false)
            }
            return cb(err)
          }
          return cb(null, stat.isFile())
        }) /** fs.stat */
      },
      (cb, exists) => {
        logger.info('if target download path exists', exists === true)
        /** if target download path does not exist, forward to download directly */
        if (!exists) {
          return downloadImage(info, cb)
        }
        /** else calculate hash of the file */
        compose([
          ncb => calculateFileHash(destPath, ncb),
          (ncb, hash) => {
            if (hash === info.checksum) {
              /** if checksum matches */
              logger.info('image exists, hash matched')
              info.status = 'downloaded'
              writeInfo(info, ncb)
              return
            }
            logger.info('image exists, yet hash not matched', hash)
            /** checksum doesn't match, clean up work dir and download image */
            compose([
              cleanImages,
              downloadImage.bind(null, info)
            ], ncb)
          }
        ], cb)
      }
    ],
    /**
     * @param {Error} err
     * @param {false|undefined} ran
     */
    function otaCleanup (err, ran) {
      logger.info('ota unlocking proc lock.')
      compose([
        cb => lockfile.unlock(procLock, cb)
      ], () => {
        if (ran === false) {
          return callback(null)
        }
        callback(err, info)
      })
    })
  })
}

/**
 * Run OTA procedure in background process.
 */
function runInBackground () {
  var cp = childProcess.spawn('iotjs', [ '/usr/lib/yoda/ota/index.js' ], {
    env: process.env,
    detached: true
  })
  cp.unref()
}

/**
 * Fetch OTA info. If update available, return local stored OTA info if possible or newly fetch otherwise.
 * @param {module:@yoda/ota~OtaInfoCallback} callback
 */
function getAvailableInfo (callback) {
  var localVersion = property.get(systemVersionProp)
  var newInfo
  compose([
    cb => otaNetwork.fetchOtaInfo(localVersion, cb),
    (cb, info) => {
      newInfo = info
      logger.info('got ota info', JSON.stringify(info))
      if (info.code === 'NO_IMAGE' || !info.version) {
        /** no available updates */
        return compose.Break(null)
      }
      readInfo(cb)
    },
    (cb, info) => {
      if (info == null) {
        return cb(null, newInfo)
      }
      return cb(null, info)
    }
  ], callback)
}

/**
 * Check if it is the first boot after an upgrade, return ota info if is, null otherwise.
 *
 * @param {module:@yoda/ota~OtaInfoCallback} callback
 */
function getInfoIfFirstUpgradedBoot (callback) {
  var localVersion = property.get(systemVersionProp)
  readInfo(function onInfo (err, info) {
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
function getInfoOfPendingUpgrade (callback) {
  readInfo(function onInfo (err, info) {
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

module.exports.getImagePath = getImagePath
module.exports.readInfo = readInfo
module.exports.readInfoAndClear = readInfoAndClear
module.exports.writeInfo = writeInfo
module.exports.resetOta = resetOta
module.exports.cleanImages = cleanImages
module.exports.calculateFileHash = calculateFileHash
module.exports.checkDiskAvailability = checkDiskAvailability
module.exports.downloadImage = downloadImage
module.exports.runInCurrentContext = runInCurrentContext
module.exports.runInBackground = runInBackground
module.exports.getAvailableInfo = getAvailableInfo
module.exports.getInfoIfFirstUpgradedBoot = getInfoIfFirstUpgradedBoot
module.exports.getInfoOfPendingUpgrade = getInfoOfPendingUpgrade
Object.assign(module.exports, otaNetwork)
