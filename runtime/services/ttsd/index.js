'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/ttsd-err.log')

var Service = require('./service')
var Dbus = require('dbus')
var Remote = require('../../lib/dbus-remote-call.js')
var TtsWrap = require('@yoda/tts')
var logger = require('logger')('ttsd')

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

var _TTS = null
var _CONFIG = null

var permit = new Remote(dbusService._dbus, {
  dbusService: VUI_SERVICE,
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
})

var lightd = new Remote(dbusService._dbus, {
  dbusService: LIGHTD_SERVICE,
  dbusObjectPath: LIGHTD_PATH,
  dbusInterface: LIGHTD_INTERFACE
})

var service = new Service({
  get tts () {
    return _TTS
  }
})

function retryGetConfig (cb) {
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

function reConnect (CONFIG) {
  if (_CONFIG &&
    _CONFIG.deviceId === CONFIG.deviceId &&
    _CONFIG.deviceTypeId === CONFIG.deviceTypeId &&
    _CONFIG.key === CONFIG.key &&
    _CONFIG.secret === CONFIG.secret) {
    logger.log('reconnect with same config')
    _TTS.reconnect()
    return
  }

  if (_TTS) { _TTS.disconnect() }

  process.nextTick(function () {
    _TTS = TtsWrap.createTts(CONFIG)
    _CONFIG = CONFIG

    _TTS.on('start', function (id, errno) {
      logger.log('ttsd start', id)
      lightd.invoke('play', ['@yoda/ttsd', '/opt/light/setSpeaking.js', '{}'])
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        ['' + id, 'start']
      )
    })
    _TTS.on('end', function (id, errno) {
      logger.log('ttsd end', id)
      lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        ['' + id, 'end']
      )
    })
    _TTS.on('cancel', function (id, errno) {
      logger.log('ttsd cancel', id)
      lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        ['' + id, 'cancel']
      )
    })
    _TTS.on('error', function (id, errno) {
      logger.log('ttsd error', id)
      lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        ['' + id, 'error']
      )
    })
  })
}

dbusApis.addMethod('connect', {
  in: ['s'],
  out: ['b']
}, function (config, cb) {
  logger.log('ttsd restart trigger by upadte config')
  reConnect(JSON.parse(config))
  cb(null, true)
})

dbusApis.addMethod('speak', {
  in: ['s', 's'],
  out: ['s']
}, function (appId, text, cb) {
  if (appId && text) {
    logger.log(`speak request: ${text} ${appId}`)

    permit.invoke('check', [appId, 'ACCESS_TTS'])
      .then((res) => {
        logger.log('ttsd check:', res, appId)
        if (res['0'] === 'true') {
          var id = service.speak(appId, text)
          cb(null, '' + id)
        } else {
          cb(null, '-1')
        }
      })
      .catch((err) => {
        logger.log('ttsd check error', appId, err)
        logger.log('can not connect to vui')
        cb(null, '-1')
      })
  } else {
    // TODO: error handler?
    logger.log(`speak error, appId and text expected`)
    cb(null, '-1')
  }
})

dbusApis.addMethod('stop', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  logger.log('tts cancel', appId)
  if (appId) {
    service.stop(appId)
    cb(null)
  } else {
    // TODO: error handler?
    cb(null)
  }
})

dbusApis.addMethod('reset', {
  in: [],
  out: ['b']
}, function (cb) {
  logger.log('reset ttsd requested by vui')
  service.reset()
  cb(null, true)
})

dbusApis.update()
logger.log('service tts started')

retryGetConfig((config) => {
  reConnect(JSON.parse(config))
})
