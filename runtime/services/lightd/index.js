'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/lightd-err.log')

var Service = require('./service')
var Dbus = require('dbus')
var Sounder = require('@yoda/multimedia').Sounder
var Remote = require('../../lib/dbus-remote-call.js')
var logger = require('logger')('lightd')

var dbusService = Dbus.registerService('session', 'com.service.light')
var dbusObject = dbusService.createObject('/rokid/light')
var dbusApis = dbusObject.createInterface('com.rokid.light.key')

var permit = new Remote(dbusService._dbus, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
})

Sounder.once('ready', () => {
  logger.info('wav audio loaded')
})
Sounder.once('error', (err) => {
  logger.error(err && err.stack)
})
Sounder.init([
  '/opt/media/volume.wav',
  '/opt/media/mic_close_tts.wav',
  '/opt/media/mic_open.wav',
  '/opt/media/awake_01.wav',
  '/opt/media/awake_02.wav',
  '/opt/media/awake_03.wav',
  '/opt/media/awake_04.wav',
  '/opt/media/awake_05.wav'])

var service = new Service({
  permit: permit
})

dbusApis.addMethod('play', {
  in: ['s', 's', 's'],
  out: ['b']
}, function (appId, name, args, cb) {
  var data = {}
  try {
    data = JSON.parse(args)
  } catch (error) {
    logger.log(`parse args error: ${args}, appId: ${appId}`)
  }
  service.loadfile(appId, name, data, (error) => {
    if (error) {
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
  service.stopFile(appId, name)
  cb(null, true)
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

dbusApis.addMethod('setLoading', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setLoading(appId)
  cb(null)
})

dbusApis.addMethod('setHide', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setHide()
  cb(null)
})

dbusApis.addMethod('setStandby', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setStandby()
  cb(null)
})

dbusApis.addMethod('setConfigFree', {
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
  logger.log(`appSound: ${appId} ${name}`)
  var result = service.appSound(appId, name)
  cb(null, result)
})

dbusApis.addMethod('setWelcome', {
  in: [],
  out: []
}, function (cb) {
  service.setWelcome()
  cb(null)
})

dbusApis.addMethod('setSpeaking', {
  in: [],
  out: []
}, function (cb) {
  service.setSpeaking()
  cb(null)
})

dbusApis.addMethod('unsetSpeaking', {
  in: [],
  out: []
}, function (cb) {
  service.stopPrev()
  cb(null)
})

dbusApis.addMethod('reset', {
  in: [],
  out: ['b']
}, function (cb) {
  logger.log('reset lightd requested by vui')
  service.setHide()
  cb(null, true)
})

dbusApis.addMethod('setPickup', {
  in: ['s', 's'],
  out: ['b']
}, function (appId, duration, cb) {
  service.setPickup(appId, +duration)
  cb(null, true)
})

dbusApis.update()

logger.log('light service started')
