'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/ttsd-err.log')

var Service = require('./service')
var Dbus = require('dbus')
var Remote = require('../../lib/dbus-remote-call.js')
var TtsWrap = require('@yoda/tts')
var logger = require('logger')('ttsd')
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

/**
 * author: sudo<xiaofei.lan@rokid.com>
 * the purpose of this variable is to declare whether to ignore the tts event.
 */
var ignoreTtsEvent = false

service.on('simulateCancel', (id) => {
  dbusService._dbus.emitSignal(
    '/tts/service',
    'tts.service',
    'ttsdevent',
    'ss',
    ['' + id, 'cancel']
  )
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
      logger.log('ttsd start', id, service.lastReqId, ignoreTtsEvent)
      AudioManager.setPlayingState(audioModuleName, true)
      lightd.invoke('play', ['@yoda/ttsd', '/opt/light/setSpeaking.js', '{}'])

      if (ignoreTtsEvent && service.lastReqId === id) {
        logger.log(`ignore tts start event with id: ${id}`)
        ignoreTtsEvent = false
        return
      }
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
      if (service.lastReqId === id) {
        service.lastReqId = -1
        service.lastAppId = ''
        service.lastText = ''
      }
      AudioManager.setPlayingState(audioModuleName, false)
      lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])

      if (ignoreTtsEvent && service.lastReqId === id) {
        logger.log(`ignore tts end event with id: ${id}`)
        return
      }
      ignoreTtsEvent = false
      /** delay 500ms to prevent event `end` been received before event `start` */
      setTimeout(() => {
        dbusService._dbus.emitSignal(
          '/tts/service',
          'tts.service',
          'ttsdevent',
          'ss',
          ['' + id, 'end']
        )
      }, 500)
    })
    _TTS.on('cancel', function (id, errno) {
      logger.log('ttsd cancel', id)
      AudioManager.setPlayingState(audioModuleName, false)
      lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])

      if (ignoreTtsEvent && service.lastReqId === id) {
        logger.log(`ignore tts cancel event with id: ${id}`)
        return
      }
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        ['' + id, 'cancel']
      )
    })
    _TTS.on('error', function (id, errno) {
      logger.error('ttsd error', id, errno)
      AudioManager.setPlayingState(audioModuleName, false)
      lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])

      if (ignoreTtsEvent && service.lastReqId === id) {
        logger.log(`ignore tts error event with id: ${id}`)
        return
      }
      ignoreTtsEvent = false
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
          if (service.lastAppId === appId) {
            ignoreTtsEvent = false
          }
          var id = service.speak(appId, text)
          cb(null, '' + id)
        } else {
          cb(null, '-1')
        }
      }, (err) => {
        logger.error('ttsd check error', appId, err)
        logger.log('can not connect to vui')
        cb(null, '-1')
      })
      .catch(err => {
        logger.error('unexpected error on speak', appId, err.stack)
        cb(null, '-1')
      })
  } else {
    // TODO: error handler?
    logger.error(`unexpected arguments: appId and text expected`, appId, text)
    cb(null, '-1')
  }
})

dbusApis.addMethod('stop', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  logger.log('tts cancel', appId)
  if (ignoreTtsEvent && service.lastAppId === appId && service.lastReqId > -1) {
    service.emit('simulateCancel', service.lastReqId)
    service.lastAppId = ''
    service.lastText = ''
    service.lastReqId = -1
    ignoreTtsEvent = false
    cb(null)
    return
  }
  if (appId) {
    if (service.lastAppId === appId) {
      ignoreTtsEvent = false
    }
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
  ignoreTtsEvent = false
  service.reset()
  cb(null, true)
})

dbusApis.addMethod('pause', {
  in: ['s'],
  out: ['b']
}, function (appId, cb) {
  logger.log(`tts pause by OS with appId: ${appId}`)
  if (!appId) {
    return cb(null, true)
  }
  ignoreTtsEvent = true
  service.pause(appId)
  cb(null, true)
})

dbusApis.addMethod('resume', {
  in: ['s'],
  out: ['b']
}, function (appId, cb) {
  logger.info('tts resume to true')
  ignoreTtsEvent = false
  service.resume(appId)
  cb(null, true)
})

dbusApis.update()
logger.log('service tts started')

retryGetConfig((config) => {
  reConnect(JSON.parse(config))
})
