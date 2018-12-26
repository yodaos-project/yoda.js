'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/ttsd-err.log')

var Service = require('./service')
var Flora = require('./flora')
var Dbus = require('dbus')
var Remote = require('../../lib/dbus-remote-call.js')
var TtsWrap = require('@yoda/tts')
var logger = require('logger')('ttsd')
var env = require('@yoda/env')()
var property = require('@yoda/property')
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
var flora = new Flora(service)
flora.init()

var ttsRegistry = {}

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
  // for detail, see https://developer.rokid.com/docs/3-ApiReference/openvoice-api.html#ttsrequest
  CONFIG.declaimer = property.get('rokid.tts.declaimer', 'persist')

  if (_TTS) { _TTS.disconnect() }

  process.nextTick(function () {
    _TTS = TtsWrap.createTts(CONFIG)
    _CONFIG = CONFIG

    _TTS.on('start', function (id, errno) {
      logger.log('ttsd start', id, service.lastReqId, service.ignoreTtsEvent)
      AudioManager.setPlayingState(audioModuleName, true)
      lightd.invoke('play',
        ['@yoda/ttsd', '/opt/light/setSpeaking.js', '{}', '{"shouldResume":true}'])

      if (service.ignoreTtsEvent && service.lastReqId === id) {
        logger.log(`ignore tts start event with id: ${id}`)
        service.ignoreTtsEvent = false
        return
      }
      ttsRegistry[id] = Date.now()
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

      if (service.ignoreTtsEvent && service.lastReqId === id) {
        logger.log(`ignore tts end event with id: ${id}`)
        return
      }
      service.ignoreTtsEvent = false
      var start = ttsRegistry[id] || 0
      delete ttsRegistry[id]
      var delta = Date.now() - start
      /** delay to 2s to prevent event `end` been received before event `start` */
      setTimeout(() => {
        dbusService._dbus.emitSignal(
          '/tts/service',
          'tts.service',
          'ttsdevent',
          'ss',
          ['' + id, 'end']
        )
      }, 2000 - delta/** it's ok to set a negative timeout */)
    })
    _TTS.on('cancel', function (id, errno) {
      logger.log('ttsd cancel', id)
      AudioManager.setPlayingState(audioModuleName, false)
      lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])

      if (service.ignoreTtsEvent && service.lastReqId === id) {
        logger.log(`ignore tts cancel event with id: ${id}`)
        return
      }

      var start = ttsRegistry[id]
      delete ttsRegistry[id]
      var delta = Date.now() - start
      /** delay to 2s to prevent event `cancel` been received before event `start` */
      setTimeout(() => {
        dbusService._dbus.emitSignal(
          '/tts/service',
          'tts.service',
          'ttsdevent',
          'ss',
          ['' + id, 'cancel']
        )
      }, 2000 - delta/** it's ok to set a negative timeout */)
    })
    _TTS.on('error', function (id, errno) {
      logger.error('ttsd error', id, errno)
      AudioManager.setPlayingState(audioModuleName, false)
      lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])

      if (service.ignoreTtsEvent && service.lastReqId === id) {
        logger.log(`ignore tts error event with id: ${id}`)
        return
      }
      service.ignoreTtsEvent = false

      var start = ttsRegistry[id]
      delete ttsRegistry[id]
      var delta = Date.now() - start
      /** delay to 2s to prevent event `error` been received before event `start` */
      setTimeout(() => {
        dbusService._dbus.emitSignal(
          '/tts/service',
          'tts.service',
          'ttsdevent',
          'sss',
          ['' + id, 'error', '' + errno]
        )
      }, 2000 - delta/** it's ok to set a negative timeout */)
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
    if (service.lastAppId === appId && service.lastReqId > -1) {
      service.emit('simulateCancel', service.lastReqId)
      service.ignoreTtsEvent = false
    }
    var id
    try {
      id = service.speak(appId, text)
    } catch (err) {
      logger.error(`Unexpected error on requesting tts.speak for app ${appId}`, err.stack)
      return cb(null, '-1')
    }
    logger.log('tts speak requested:', id)
    cb(null, '' + id)
  } else {
    // TODO: error handler?
    logger.error(`unexpected arguments: appId and text expected`, appId, text)
    cb(null, '-1')
  }
})

function stop (appId, cb) {
  logger.log('tts cancel', appId)
  if (service.ignoreTtsEvent && service.lastAppId === appId && service.lastReqId > -1) {
    service.emit('simulateCancel', service.lastReqId)
    service.lastAppId = ''
    service.lastText = ''
    service.lastReqId = -1
    service.ignoreTtsEvent = false
    cb(null)
    return
  }
  if (appId) {
    if (service.lastAppId === appId) {
      service.ignoreTtsEvent = false
    }
    service.stop(appId)
    cb(null)
  } else {
    // TODO: error handler?
    cb(null)
  }
}
dbusApis.addMethod('stop', {
  in: ['s'],
  out: []
}, stop)

dbusApis.addMethod('reset', {
  in: [],
  out: ['b']
}, function (cb) {
  logger.log('reset ttsd requested by vui')
  service.reset()
  cb(null, true)
})

dbusApis.addMethod('pause', {
  in: ['s'],
  out: ['b']
}, function (appId, cb) {
  if (!appId) {
    logger.warn('ignore tts pause by OS because not given appId')
    return cb(null, true)
  }
  logger.log(`tts pause by OS with appId: ${appId}`)
  service.pause(appId)
  cb(null, true)
})

dbusApis.addMethod('resume', {
  in: ['s'],
  out: ['b']
}, function (appId, cb) {
  logger.info('tts resume to true')
  service.resume(appId)
  cb(null, true)
})

dbusApis.addMethod('resetAwaken', {
  in: ['s'],
  out: ['b']
}, function (appId, cb) {
  var pausedAppIdOnAwaken = service.pausedAppIdOnAwaken
  service.pausedAppIdOnAwaken = null
  if (!appId) {
    logger.log('reset awaken requested by vui, stopping paused app', pausedAppIdOnAwaken)
    return stop(pausedAppIdOnAwaken, () => cb(null, true))
  }
  logger.log('reset awaken requested by vui', appId, '; paused app', pausedAppIdOnAwaken)
  if (pausedAppIdOnAwaken && appId === pausedAppIdOnAwaken) {
    service.resume(pausedAppIdOnAwaken)
  }
  cb(null, true)
})

dbusApis.update()
logger.log('service tts started')

retryGetConfig((config) => {
  config = JSON.parse(config)
  config = Object.assign({}, config, { host: env.cloudgw.wss })
  reConnect(config)
})
