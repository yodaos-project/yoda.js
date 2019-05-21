'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/ttsd-err.log')

var Dbus = require('dbus')
var Flora = require('./flora')
var TtsService = require('./service')
var Remote = require('../../lib/dbus-remote-call.js')
var TtsWrap = require('@yoda/tts')
var logger = require('logger')('ttsd')
var env = require('@yoda/env')()
var AudioManager = require('@yoda/audio').AudioManager
var audioModuleName = 'tts'
AudioManager.setPlayingState(audioModuleName, false)// vui prop definitions

// vui prop definitions
var VUI_SERVICE = 'com.rokid.AmsExport'
var DBUS_PROP_PATH = '/activation/prop'
var DBUS_PROP_INTERFACE = 'com.rokid.activation.prop'

var dbusService = Dbus.registerService('session', 'com.service.tts')
var dbusObject = dbusService.createObject('/tts/service')
var dbusApis = dbusObject.createInterface('tts.service')

var LIGHTD_SERVICE = 'com.service.light'
var LIGHTD_PATH = '/rokid/light'
var LIGHTD_INTERFACE = 'com.rokid.light.key'

var lightd = new Remote(dbusService._dbus, {
  dbusService: LIGHTD_SERVICE,
  dbusObjectPath: LIGHTD_PATH,
  dbusInterface: LIGHTD_INTERFACE
})

var ttsd = new TtsService(lightd)
var flora = new Flora(ttsd)
flora.init()

;['start',
  'end',
  'cancel',
  'error'
].forEach(it => {
  ttsd.on(it, function (reqId, appId, errno) {
    logger.debug('emitting tts event', it)
    if (it === 'error') {
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'sss',
        [`${reqId}`, it, `${errno}`]
      )
    } else {
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        [`${reqId}`, it]
      )
    }
  })
})

function getConfig (cb) {
  dbusService._dbus.callMethod(
    VUI_SERVICE,
    DBUS_PROP_PATH,
    DBUS_PROP_INTERFACE,
    'all', 's', ['@ttsd'], function (res) {
      if (res !== null) {
        cb(res[0])
      }
    })
}

function connect (config) {
  logger.log('ttsd restart trigger by upadte config')
  config = JSON.parse(config)
  config = Object.assign({}, config, { host: env.cloudgw.wss })
  ttsd.connect(config)
}

dbusApis.addMethod('connect', {
  in: ['s'],
  out: ['b']
}, function (config, callback) {
  connect(config)
  callback(null, true)
})

dbusApis.addMethod('speak', {
  in: ['s', 's'],
  out: ['s']
}, function (appId, text, callback) {
  if (!appId || !text) {
    // TODO: error handler?
    logger.error(`unexpected arguments: appId and text expected`, appId, text)
    return callback(null, '-1')
  }
  logger.log(`speak request: ${text} ${appId}`)

  var id = ttsd.speak(appId, text)
  logger.log('tts speak requested:', id)
  return callback(null, `${id}`)
})

dbusApis.addMethod('stop', {
  in: ['s'],
  out: []
}, function stop (appId, callback) {
  logger.log('tts cancel', appId)

  if (!appId) {
    return callback(null, false)
  }
  ttsd.stop(appId)
  return callback(null, true)
})

dbusApis.addMethod('reset', {
  in: [],
  out: ['b']
}, function reset (callback) {
  logger.log('reset ttsd requested by vui')
  ttsd.reset()
  callback(null, true)
})

dbusApis.addMethod('pause', {
  in: ['s'],
  out: ['b']
}, function pause (appId, callback) {
  if (!appId) {
    logger.warn('ignore tts pause by OS because not given appId')
    return callback(null, true)
  }
  logger.log(`tts pause by OS with appId: ${appId}`)
  ttsd.pause(appId)
  callback(null, true)
})

dbusApis.addMethod('resume', {
  in: ['s'],
  out: ['b']
}, function resume (appId, callback) {
  logger.info('tts resume to true')
  ttsd.resume(appId)
  callback(null, true)
})

dbusApis.addMethod('resetAwaken', {
  in: ['s'],
  out: ['b']
}, function resetAwaken (appId, callback) {
  var pausedReqIdOnAwaken = ttsd.pausedReqIdOnAwaken
  var pausedAppIdOnAwaken = ttsd.pausedAppIdOnAwaken
  ttsd.pausedReqIdOnAwaken = null
  ttsd.pausedAppIdOnAwaken = null

  var appMemo = ttsd.appRequestMemo[appId]
  if (appMemo == null) {
    logger.info(`reset awaken requested by vui, yet doesn't have any memo of app(${appId})`)
    ttsd.stop(pausedAppIdOnAwaken, pausedReqIdOnAwaken)
    return callback(null, false)
  }
  if (appMemo.reqId !== pausedReqIdOnAwaken) {
    logger.info(`reset awaken requested by vui, yet app(${appId}) may have requested new speak`)
    return callback(null, false)
  }
  logger.log(`reset awaken requested by vui, resuming app(${appId})`)
  ttsd.resume(appId)
  callback(null, true)
})

dbusApis.update()
logger.log('service tts started')
getConfig(connect)
