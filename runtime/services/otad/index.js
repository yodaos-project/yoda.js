'use strict'

var CloudGW = require('@yoda/cloudgw')
var ota = require('@yoda/ota')
var otaNetwork = require('@yoda/ota/network')
var system = require('@yoda/system')
var logger = require('logger')('otad')
var yodaUtil = require('@yoda/util')
var dbus = require('dbus').getBus('session')

var compose = yodaUtil.compose

var ifaceOpenvoice

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
    iface.all('@ota', cb)
  },
  (cb, propStr) => {
    var config
    try {
      config = JSON.parse(propStr)
    } catch (err) {
      cb(err)
    }
    otaNetwork.cloudgw = new CloudGW(config)
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
    main(cb)
  }
], function onDone (err) {
  if (err) {
    logger.error('unexpected error', err.message, err.stack)
    return process.exit(1)
  }
  process.exit()
})

function main (done) {
  // clean the recovery state if it is ok or error.
  var recoveryState = system.getRecoveryState().recovery_state
  if (recoveryState === 'recovery_ok' ||
    recoveryState === 'recovery_error') {
    system.onRecoveryComplete()
  }
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
