'use strict'

var test = require('tape')
var mock = require('@yoda/mock')
var logger = require('logger')('ota')
var otaNetwork = require('@yoda/ota/network')
var dbus = require('dbus').getBus('session')
var yodaUtil = require('@yoda/util')
var compose = yodaUtil.compose
var CloudGW = require('@yoda/cloudgw')

test('ota check should be ok if intent is start_sys_upgrade', t => {
  logger.info('====start====')
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
      } catch (err) {
        cb(err)
      }
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
    )], function onDone (err) {
    if (err) {
      logger.error('unexpected error', err.message, err.stack)
    }
  })
  mock.mockAppRuntime('/opt/apps/ota')
    .then(runtime => {
      runtime.restore()
      runtime.mockService('tts', 'speak', function (appid, text) {
        console.log('======test:' + text + '==========')
        t.equal(appid, '@yoda/ota')
        t.equal(text, '已经是最新的系统版本了')
        t.end()
        return process.exit()
      })
      runtime.handleNlpIntent(undefined, {intent: 'start_sys_upgrade', appId: 'R07D6E0137294FFBBFEF623315220FD4'})

      // runtime.openUrl()
      // runtime.loader.getAppById('@yoda/ota')
    })
})
