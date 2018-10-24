var fs = require('fs')
var property = require('@yoda/property')
var wifi = require('@yoda/wifi')
var compose = require('@yoda/util').compose
var logger = require('logger')('exodus')
var _ = require('@yoda/util')._

module.exports = exodus
function exodus (callback) {
  var migrated = property.get('sys.migrated.from.lua', 'persist') === '1'
  if (migrated) {
    logger.info('already migrated from lua, skipping.')
    return process.nextTick(() => callback(null))
  }

  var wifiConfig = '/data/rokid_wifi.json'

  compose([
    cb => fs.stat(wifiConfig, (err, stats) => {
      if (err) {
        if (err.code !== 'ENOENT') {
          return cb(err)
        }
        logger.info(`${wifiConfig} doesn't exists, skipping.`)
        return compose.Break()
      }
      cb(null, stats)
    }),
    (cb, stats) => {
      if (!stats.isFile()) {
        return compose.Break()
      }
      var data
      try {
        data = require(wifiConfig)
      } catch (err) {
        cb(err)
        return
      }
      var history = _.get(data, 'history')
      if (!Array.isArray(history)) {
        return compose.Break()
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
      process.nextTick(() => cb(null))
    }
  ], (err) => {
    if (err) {
      return callback(err)
    }
    logger.info(`Now begins the new life.`)
    property.set('sys.migrated.from.lua', '1', 'persist')
    callback(null)
  })
}
