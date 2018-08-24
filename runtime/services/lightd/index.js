'use strict'

var Service = require('./service')
var Dbus = require('dbus')
var Remote = require('../../lib/dbus-remote-call.js')
var Light = require('light')
var MediaPlayer = require('multimedia').MediaPlayer
var logger = require('logger')('lightd')
var Effects = require('./effects')

var dbusService = Dbus.registerService('session', 'com.service.light')
var dbusObject = dbusService.createObject('/rokid/light')
var dbusApis = dbusObject.createInterface('com.rokid.light.key')

var permit = new Remote(dbusService._dbus, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
})

var effect = new Effects(Light, MediaPlayer)

var service = new Service({
  effect: effect,
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
  service.loadfile(name, data, (error) => {
    if (error) {
      cb(null, false)
    } else {
      cb(null, true)
    }
  })
})

dbusApis.addMethod('setAwake', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setAwake()
  cb(null)
})

dbusApis.addMethod('setDegree', {
  in: ['s', 's'],
  out: []
}, function (appId, degree, cb) {
  service.setDegree(+degree)
  cb(null)
})

dbusApis.addMethod('setLoading', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setLoading()
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
  service.setConfigFree()
  cb(null)
})

dbusApis.addMethod('appSound', {
  in: ['s', 's'],
  out: []
}, function (appId, name, cb) {
  service.appSound(appId, name)
  cb(null)
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

dbusApis.update()

logger.log('light service started')
