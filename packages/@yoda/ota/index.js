'use strict'

/**
 * @module @yoda/ota
 */

/**
 * @typedef {Object} OtaInfo
 * @property {string} imageUrl -
 * @property {string} authorize -
 * @property {string} changelog -
 * @property {string} checksum -
 * @property {boolean} isForceUpdate -
 * @property {string} version -
 */

var fs = require('fs')
var path = require('path')
var crypto = require('crypto')

var yodaUtil = require('@yoda/util')
var lockfile = require('lockfile')
var system = require('@yoda/system')
var property = require('property')
var logger = require('logger')('ota')

var otaNetwork = require('./network')

var compose = yodaUtil.compose

var upgradeDir = '/data/upgrade'
var procLock = upgradeDir + '/proc.lock'
var infoLock = upgradeDir + '/info.lock'
var infoFile = upgradeDir + '/info.json'
var systemVersionProp = 'ro.build.version.release'

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
 * @callback lockCallback
 * @param {err} error
 * @param {Function} unlock
 */

/**
 *
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

function readInfo (callback) {
  lockInfo(function onInfoLocked (err, unlock) {
    if (err) {
      return callback(err)
    }

    fs.stat(infoFile, function onStat (err) {
      if (err) {
        if (err.code === 'ENOENT') {
          return unlock(function onUnlock () {
            callback(null, null)
          })
        }
        return unlock(function onUnlock () {
          callback(err)
        })
      }

      var info
      try {
        info = require(infoFile)
      } catch (err) {
        return unlock(function onUnlock () {
          callback(err)
        })
      }

      unlock(function onUnlock () {
        callback(null, info)
      })
    }) /** END: fs.stat */
  }) /** END: lockInfo */
}

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
 *
 * @param {module:yoda@ota~OtaInfo} info
 * @param {Function} callback
 */
function prepareOta (info, callback) {
  // TODO: if image is downloading?
  var imagePath = getImagePath(info)
  fs.stat(imagePath, function onStat (err, stat) {
    if (err) {
      return callback(err)
    }
    var size = stat.size
    if (info.size !== size) {
      return callback(new Error('image size is not aligned with info.size'))
    }
    var ret = system.prepareOta(imagePath)
    if (ret !== 0) {
      return callback(new Error(`set_recovery_cmd_status(${ret})`))
    }
    callback(null)
  }) /** fs.stat */
}

/**
 *
 * @param {Function} callback
 */
function resetOta (callback) {
  process.nextTick(function onResetOtaNextTick () {
    var ret = system.prepareOta('')
    if (ret !== 0) {
      return callback(new Error(`set_recovery_cmd_status(${ret})`))
    }
    callback(null)
  }) /** process.nextTick */
}

/**
 *
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
    unlinkFiles(files, callback)
  }) /** fs.readdir */
}

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
 *
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
      callback(new Error(`Disk space not available for new ota image, expect ${imageSize}, got ${diskUsage.available}`))
      return
    }
    callback(null, true)
  }) /** fs.stat */
}

/**
 *
 * @param {module:@yoda/ota~OtaInfo} info
 * @param {Function} callback
 */
function downloadImage (info, callback) {
  var dest = getImagePath(info)
  compose([
    cb => otaNetwork.fetchImageSize(info.imageUrl, cb),
    (cb, imageSize) => checkDiskAvailability(imageSize, dest, cb),
    cb => otaNetwork.doDownloadImage(info.imageUrl, dest, { noCheckCertificate: true }, cb),
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

function run (callback) {
  var localVersion = property.get(systemVersionProp)
  var info
  var destPath
  compose([
    /** make work dir */
    cb => mkdirp(upgradeDir, cb),
    /** lock proc to run exclusively */
    cb => lockfile.lock(procLock, cb),
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
      writeInfo(info, cb)
    },
    cb => {
      destPath = getImagePath(info)
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
            logger.info('image exists, hash matched')
            /** if checksum matches, exit compose */
            return compose.Break()
          }
          logger.info('image exists, yet hash not matched', hash)
          /** checksum doesn't match, clean up work dir and download image */
          cleanImages(ncb)
        },
        ncb => downloadImage(info, ncb)
      ], cb)
    }
  ],
  /**
   * @param {Error} err
   * @param {false|undefined} ran
   */
  function otaCleanup (err, ran) {
    logger.info('ota cleaning up.')
    compose([
      cb => lockfile.unlock(procLock, cb)
    ], () => {
      if (ran === false) {
        return callback(null)
      }
      callback(err, destPath)
    })
  })
}

module.exports.getImagePath = getImagePath
module.exports.readInfo = readInfo
module.exports.writeInfo = writeInfo
module.exports.prepareOta = prepareOta
module.exports.resetOta = resetOta
module.exports.cleanImages = cleanImages
module.exports.calculateFileHash = calculateFileHash
module.exports.checkDiskAvailability = checkDiskAvailability
module.exports.downloadImage = downloadImage
module.exports.run = run
Object.assign(module.exports, otaNetwork)
