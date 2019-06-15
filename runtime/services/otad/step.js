var fs = require('fs')
var path = require('path')
var logger = require('logger')('otad/step')
var system = require('@yoda/system')
var yodaUtil = require('@yoda/util')
var property = require('@yoda/property')

var common = require('@yoda/ota')
var lock = require('@yoda/ota/lock')
var persistance = require('@yoda/ota/persistance')
var constants = require('@yoda/ota/const')

var wget = require('./wget')

var compose = yodaUtil.compose
var systemVersionProp = 'ro.build.version.release'

/**
 * Calculate if there is available disk space left for pending image to be downloaded.
 *
 * @private
 * @param {number} imageSize - expected image size
 * @param {string} destPath - image path to be downloaded to
 * @param {Function} callback
 */
module.exports.checkDiskAvailability = checkDiskAvailability
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
    var diskUsage = system.diskUsage(constants.upgradeDir)
    var left = diskUsage.available - imageSize + downloadedSize
    if (left < 5 * 1024 * 1024) {
      /**
       * no space left for new image, try remove existed images
       * TODO: monkey army, remove arbitrary low prioritized files
       */
      return fs.readdir(constants.upgradeDir, (_, files) => {
        if (files && files.length) {
          files = files.filter(it => path.extname(it) === '.img')
          if (files.length) {
            return common.cleanImages(() => checkDiskAvailability(imageSize, destPath, callback))
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
module.exports.downloadImage = downloadImage
function downloadImage (delegate, info, callback) {
  var dest = persistance.getImagePath(info)
  compose([
    cb => {
      checkDiskAvailability(info.imageSize, dest, cb)
    },
    cb => {
      info.status = 'downloading'
      persistance.writeInfo(info, cb)
    },
    cb => wget.download(info.imageUrl, dest, { noCheckCertificate: true, continue: true }, cb),
    cb => {
      logger.info('ota image successfully downloaded, calculating hash')
      delegate.checkIntegrity(dest, info.integrity, cb)
    },
    (cb, result) => {
      if (!result) {
        info.status = 'error'
        persistance.writeInfo(info, () => {
          cb(new Error(`Image integrity check failed`))
        })
        return
      }
      info.status = 'downloaded'
      persistance.writeInfo(info, cb)
    },
    cb => cb(null, true)
  ], callback)
}

/**
 * Run OTA procedure in current process context.
 *
 * 0. [delegates] prelude check
 * 1. lock program to prevent from concurrent multiple OTA processes;
 * 2. make working directory;
 * 3. [delegates] fetch OTA info;
 * 4. check if new version available;
 * 5. check if local pending update exists;
 * 6. check if local image exists;
 *   1. if image not exists, download image;
 *   2. if image exists, [delegates] check image integrity:
 *     a. if image integrity matches, exit 0;
 *     b. if image integrity does not match, cleanup, and goto section 6.1.
 * 7. write download status to info file on local disk.
 *
 * @param {} delegate -
 * @param {OtaInfoCallback} callback
 */
module.exports.runInCurrentContext = runInCurrentContext
function runInCurrentContext (delegate, callback) {
  var unlockProc

  /** prepare to run */
  compose([
    /** make working directory */
    cb => yodaUtil.fs.mkdirp(constants.upgradeDir, cb),
    cb => lock(constants.procLock, cb),
    (cb, unlock) => {
      unlockProc = unlock
      cb()
    },
    cb => delegate.prelude(cb),
    (cb, result) => {
      if (!result) {
        return compose.Break(null)
      }
      cb()
    },
    /** actual procedure, shall skip if prepare failed */
    cb => doRun(cb)
  ], (err, info) => {
    logger.info('ota unlocking proc lock.')
    if (typeof unlockProc !== 'function') {
      /** lockProc failed */
      return callback(new Error('Cannot unlock proc.lock for not existing unlock handle'))
    }
    unlockProc(() => {
      if (err) {
        return callback(err)
      }
      callback(null, info)
    })
  })

  function doRun (callback) {
    var localVersion = property.get(systemVersionProp)
    var info
    var destPath
    compose([
      /**
       * get new version info if available
       * @returns {module:@yoda/ota~OtaInfo}
       */
      cb => delegate.fetchOtaInfo(localVersion, cb),
      /**
       * @returns {boolean} if target image exists
       */
      (cb, nfo) => {
        info = nfo
        logger.info('got ota info', JSON.stringify(nfo))
        if (!info.imageUrl || !info.version) {
          /** no available updates */
          return compose.Break(false)
        }
        destPath = persistance.getImagePath(info)
        info.imagePath = destPath
        /** check if local pending update exists */
        persistance.readInfo(cb)
      },
      (cb, localInfo) => {
        /**
         * new updates may be over the air whilst local pending update not installed yet.
         * discard pending updates to prevent corruptions.
         */
        if (localInfo) {
          if (localInfo.version !== info.version || localInfo.integrity !== info.integrity) {
            return compose([
              common.cleanup,
              persistance.writeInfo.bind(null, info)
            ], cb)
          }
        }
        persistance.writeInfo(info, cb)
      },
      (cb) => {
        downloadImage(delegate, info, cb)
      }
    ],
    /**
     * @param {Error} err
     * @param {false|undefined} ran
     */
    function otaCleanup (err, ran) {
      if (ran === false) {
        return callback(null)
      }
      callback(err, info)
    })
  }
}
