'use strict'

var test = require('tape')
var CloudGW = require('@yoda/cloudgw')
var ota = require('@yoda/ota')
var otaNetwork = require('@yoda/ota/network')
var system = require('@yoda/system')
var logger = require('logger')('otadtest')
var yodaUtil = require('@yoda/util')
var dbus = require('dbus').getBus('session')
var compose = yodaUtil.compose
var ifaceOpenvoice

test('ato should be ok ', t => {
  t.plan()
  logger.info('========t start=========')
  compose([
    cb => {
      dbus.getInterface(
        'com.rokid.AmsExport',
        '/activation/prop',
        'com.rokid.activation.prop',
        cb
      )
    },
    (cb, iface) => {
      if (iface == null || typeof iface.all !== 'function') {
        cb(new Error('VuiDaemon not ready, try again later.'))
      }
      iface.all('@ota', cb)
      logger.info('========(cb, iface)=========')
    },
    (cb, propStr) => {
      var config
      try {
        config = JSON.parse(propStr)
        logger.info('========propStr:' + propStr + '=========')
      } catch (err) {
        cb(err)
      }
      logger.info('========config:' + config + '=========')
      try {
        otaNetwork.cloudgw = new CloudGW(config)
      } catch (err) {
        cb(new Error('Unexpected error in initializing CloudGW, this may related to un-connected network or device not logged in yet.'))
      }
      cb()
    },
    cb => dbus.getInterface(
      'com.rokid.AmsExport',
      '/rokid/openvoice',
      'rokid.openvoice.AmsExport',
      cb
    ),
    (cb, iface) => {
      ifaceOpenvoice = iface
      logger.info('==========ifaceOpenvoice:' + JSON.stringify(ifaceOpenvoice) + '========')
      main(cb)
    }
  ], function onDone (err) {
    if (err) {
      logger.error('unexpected error', err.message, err.stack)
      return process.exit(1)
    }
    logger.info('========process finish=========')
    process.exit()
  })
  t.end()
})

function main (done) {
  ota.runInCurrentContext(function onOTA (err, info) {
    logger.info('ota ran')
    if (err) {
      logger.error(err.message, err.stack)
      if (err.code === 'EEXIST') {
        return done()
      }
      /** not errored for locking, shall retry in a short sleep */
      return ota.resetOta(() => done(err))
    }
    var imagePath = info && info.imagePath
    if (typeof imagePath !== 'string') {
      logger.info('No updates found, exiting.')
      return ota.resetOta(done)
    }
    var ret = system.prepareOta(imagePath)
    logger.info(
      `OTA prepared with status code ${ret}, terminating.`)

    if (!info.isForceUpdate) {
      return done()
    }
    ifaceOpenvoice.ForceUpdateAvailable(done)
  })
}
