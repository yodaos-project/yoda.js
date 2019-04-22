var fs = require('fs')
var logger = require('logger')('exodus')
var AudioManager = require('@yoda/audio').AudioManager
var property = require('@yoda/property')
var wifi = require('@yoda/wifi')
var compose = require('@yoda/util').compose
var _ = require('@yoda/util')._

function readConfig (path, callback) {
  fs.stat(path, (err, stats) => {
    if (err) {
      if (err.code !== 'ENOENT') {
        return callback(err)
      }
      logger.info(`${path} doesn't exists, skipping.`)
      return callback(null, null)
    }
    if (!stats.isFile()) {
      return callback(null, null)
    }
    var data
    try {
      data = require(path)
    } catch (err) {
      callback(err)
      return
    }
    callback(null, data)
  })
}

function migrationOfWiFi (callback) {
  logger.info('migrating wifi config.')

  var wifiConfig = '/data/rokid_wifi.json'

  compose([
    cb => readConfig(wifiConfig, cb),
    (cb, data) => {
      if (data == null) {
        return cb(null)
      }

      var history = _.get(data, 'history')
      if (!Array.isArray(history)) {
        return cb(null)
      }
      history.forEach(it => {
        var ssid = _.get(it, 'S')
        var passcode = _.get(it, 'P')
        if (!ssid || typeof passcode !== 'string') {
          logger.info(`malformed config of ssid(${ssid}), skipping.`)
          return
        }
        try {
          logger.info(`connecting ssid(${ssid})...`)
          wifi.joinNetwork(ssid, passcode)
        } catch (err) {}
        wifi.enableScanPassively()
        wifi.save()
      })
      cb(null)
    }
  ], (err) => {
    if (err) {
      logger.error('Unexpected error on migrating WiFi config', err.stack)
    }
    callback()
  })
}

function migrationOfVolume (callback) {
  logger.info('migrating volume config.')

  var volumeConfig = '/data/rokid_volume.json'

  compose([
    cb => readConfig(volumeConfig, cb),
    (cb, data) => {
      if (data == null) {
        return cb(null)
      }

      var volume = _.get(data, 'volume')
      if (typeof volume !== 'number') {
        volume = Number(volume)
      }
      if (isNaN(volume)) {
        return cb(null)
      }
      AudioManager.setVolume(volume)
      cb(null)
    }
  ], (err) => {
    if (err) {
      logger.error('Unexpected error on migrating volume config', err.stack)
    }
    callback()
  })
}

function migrationOfRokid (callback) {
  logger.info('migrating rokid config.')

  var rokidConfig = '/data/rokid_config.json'

  compose([
    cb => readConfig(rokidConfig, cb),
    (cb, data) => {
      if (data == null) {
        return cb(null)
      }

      if (_.get(data, /** intended for history reason */'qqmusic')) {
        property.set('sys.firstboot.init', '1', 'persist')
      }
      cb(null)
    }
  ], (err) => {
    if (err) {
      logger.error('Unexpected error on migrating rokid config', err.stack)
    }
    callback()
  })
}

function migrationOfOtaInfo (callback) {
  logger.info('migrating ota info.')

  compose([
    cb => fs.stat('/data/upgrade/info', (_ /** ignoring error */, stat) => {
      cb(null, stat)
    }),
    (cb, stat) => {
      if (stat == null) {
        return compose.Break()
      }
      if (!stat.isFile()) {
        return compose.Break()
      }
      return fs.rename('/data/upgrade/info', '/data/upgrade/info.json', cb)
    }
  ], (err) => {
    if (err) {
      logger.error('Unexpected error on migrating ota info', err.stack)
    }
    callback()
  })
}

module.exports = exodus
function exodus (callback) {
  var migrationKey = 'sys.migration.lua'
  var migrated = property.get(migrationKey, 'persist') === '1'
  if (migrated) {
    logger.info('already migrated from lua, skipping.')
    return process.nextTick(() => callback(null))
  }

  compose([
    migrationOfWiFi,
    migrationOfVolume,
    migrationOfRokid,
    migrationOfOtaInfo
  ], (err) => {
    if (err) {
      return callback(err)
    }
    logger.info(`Now begins the new life.`)
    property.set(migrationKey, '1', 'persist')
    callback(null)
  })
}
