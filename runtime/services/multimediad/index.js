'use strict'

var Service = require('./service')
var Dbus = require('dbus')
var Remote = require('../../lib/dbus-remote-call.js')
var Media = require('multimedia')
var logger = require('logger')('multimediad')

var dbusService = Dbus.registerService('session', 'com.service.multimedia')
var dbusObject = dbusService.createObject('/multimedia/service')
var dbusApis = dbusObject.createInterface('multimedia.service')

var permit = new Remote(dbusService._dbus, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
})

var service = new Service({
  Multimedia: Media.MediaPlayer,
  permit: permit
})

service.on('prepared', function (id, dur, pos) {
  logger.log('multimediad prepared', Array.prototype.slice.call(arguments, 0))
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssss',
    [id, 'prepared', dur, pos]
  )
})
service.on('playbackcomplete', function (id) {
  logger.log('multimediad playback complete', Array.prototype.slice.call(arguments, 0))
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'playbackcomplete']
  )
})
service.on('bufferingupdate', function (id) {
  logger.log('multimediad buffering update', Array.prototype.slice.call(arguments, 0))
})
service.on('seekcomplete', function (id) {
  logger.log('multimediad seek complete', Array.prototype.slice.call(arguments, 0))
})
service.on('error', function (id) {
  logger.log('multimediad error', Array.prototype.slice.call(arguments, 0))
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'error']
  )
})

dbusApis.addMethod('start', {
  in: ['s', 's'],
  out: ['s']
}, function (appId, url, cb) {
  logger.log('multimedia play', appId, url)
  if (appId && url) {
    service.start(appId, url)
      .then((id) => {
        logger.log('return', id, typeof id)
        cb(null, id)
      })
      .catch(() => {
        cb(null, '-1')
      })
  } else {
    cb(null, '-1')
  }
})

dbusApis.addMethod('stop', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  logger.log('multimedia cancel', appId)
  if (appId) {
    service.stop(appId)
  }
  cb(null)
})

dbusApis.addMethod('pause', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  logger.log('multimedia pause', appId)
  if (appId) {
    service.pause(appId)
  }
  cb(null)
})

dbusApis.addMethod('resume', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  logger.log('multimedia resume', appId)
  if (appId) {
    service.resume(appId)
  }
  cb(null)
})

dbusApis.addMethod('getPosition', {
  in: ['s'],
  out: ['n']
}, function (appId, cb) {
  if (appId) {
    var pos = service.getPosition(appId)
    cb(null, pos)
  } else {
    cb(null, -1)
  }
})

dbusApis.addMethod('seek', {
  in: ['s', 's'],
  out: ['b']
}, function (appId, position, cb) {
  logger.log('seek', position, typeof position)
  if (appId && position !== '' && +position >= 0) {
    service.seek(appId, +position, (error) => {
      if (error) {
        cb(null, false)
      } else {
        cb(null, true)
      }
    })
  } else {
    cb(null, false)
  }
})

logger.log('service multimedia started')
