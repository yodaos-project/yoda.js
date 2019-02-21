'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/lightd-err.log')

var Dbus = require('dbus')
var logger = require('logger')('lightd')
var Sounder = require('@yoda/multimedia').Sounder

var Service = require('./service')
var Flora = require('./flora')

var dbusService = Dbus.registerService('session', 'com.service.light')
var dbusObject = dbusService.createObject('/rokid/light')
var dbusApis = dbusObject.createInterface('com.rokid.light.key')

Sounder.once('ready', () => {
  logger.info('wav audio loaded')
})
Sounder.once('error', (err) => {
  logger.error(err && err.stack)
})
Sounder.init([
  '/opt/media/volume.wav',
  '/opt/media/mic_close_tts.wav',
  '/opt/media/mic_open.wav'
])

var service = new Service()
var flora = new Flora(service)
flora.init()

dbusApis.addMethod('play', {
  in: ['s', 's', 's', 's'],
  out: ['b']
}, function (appId, name, args, optionStr, cb) {
  var data = {}
  var option = {}
  // anyone maybe parse error
  try {
    data = JSON.parse(args)
  } catch (error) {
    logger.log(`json.parse data error: ${error.message}, data: '${args}', appId: ${appId}`)
  }
  try {
    option = JSON.parse(optionStr)
  } catch (error) {
    logger.error(`json.parse option error: ${error.message}, option: '${optionStr}', appId: ${appId}`)
  }
  service.loadfile(appId, name, data, option, (err) => {
    if (err) {
      logger.error(`execute ${name}(${appId}) with the following error:`, err)
      cb(null, false)
    } else {
      cb(null, true)
    }
  })
})

dbusApis.addMethod('stop', {
  in: ['s', 's'],
  out: ['b']
}, function (appId, name, cb) {
  logger.log(`[${appId}] request stop with uri: [${name}]`)
  if (appId) {
    service.stopFile(appId, name)
    cb(null, true)
  } else {
    cb(null, false)
  }
})

dbusApis.addMethod('setAwake', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setAwake(appId)
  cb(null)
})

dbusApis.addMethod('setDegree', {
  in: ['s', 's'],
  out: []
}, function (appId, degree, cb) {
  service.setDegree(appId, +degree)
  cb(null)
})

dbusApis.addMethod('setHide', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setHide()
  cb(null)
})

dbusApis.addMethod('appSound', {
  in: ['s', 's'],
  out: ['b']
}, function (appId, name, cb) {
  logger.log(`request appSound: appId: '${appId}' uri: '${name}'`)
  if (appId && name) {
    service.appSound(appId, name, (err) => {
      if (err) {
        logger.error(`appSound error: ${appId}, ${name}, ${err.message}`)
        cb(null, false)
      } else {
        cb(null, true)
      }
    })
  } else {
    logger.error('appSound: ignore this request because no appId or uri given')
    cb(null, false)
  }
})

dbusApis.addMethod('stopSound', {
  in: ['s'],
  out: ['b']
}, function (appId, cb) {
  if (appId) {
    logger.log(`stopSound: request with appId: '${appId}'`)
    service.stopSoundByAppId(appId)
    cb(null, true)
  } else {
    logger.error('stopSound: ignore this request because no appId given')
    cb(null, false)
  }
})

dbusApis.addMethod('reset', {
  in: [],
  out: ['b']
}, function (cb) {
  logger.log('reset lightd requested by vui')
  service.reset()
  cb(null, true)
})

var lastPlayed = null
dbusApis.addMethod('networkLagSound', {
  in: ['s', 's'],
  out: ['b']
}, function networkLagSound (name, ignoreGap, cb) {
  if (typeof ignoreGap === 'function') {
    cb = ignoreGap
    ignoreGap = false
  }
  // FIXME: dbus bug to pass boolean as argument
  ignoreGap = !!ignoreGap
  if (!name || typeof name !== 'string') {
    logger.error(`unexpected argument type ${typeof name} of networkLagSound.`)
    return cb(null, false)
  }
  if (!ignoreGap && lastPlayed && Date.now() - lastPlayed < 15 * 1000) {
    logger.warn(`skip network lag sound ${name} for recently played lag sound.`)
    return cb(null, false)
  }
  lastPlayed = Date.now()
  service.loadfile('@network-lag', '/opt/light/loading.js',
    { timeout: /** shall keep playing if possible */0 },
    {},
    (err) => {
      if (err) {
        logger.error('network lag loading effect error', err.stack)
      }
    })
  service.appSound('@network-lag', name, (err) => {
    if (err) {
      logger.error(`appSound error: ${name}, ${err.message}`)
      cb(null, false)
      return
    }
    cb(null, true)
  })
})

dbusApis.addMethod('stopNetworkLagSound', {
  in: [],
  out: ['b']
}, function stopNetworkLagSound (cb) {
  service.stopSoundByAppId('@network-lag')
  service.stopFile('@network-lag')
  cb(null, true)
})
dbusApis.update()

logger.log('light service started')
