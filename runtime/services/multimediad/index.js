'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/multimediad-err.log')

var _ = require('@yoda/util')._
var Service = require('./service')
var Dbus = require('dbus')
var Remote = require('../../lib/dbus-remote-call.js')
var logger = require('logger')('multimediad')

var dbusService = Dbus.registerService('session', 'com.service.multimedia')
var dbusObject = dbusService.createObject('/multimedia/service')
var dbusApis = dbusObject.createInterface('multimedia.service')

var permit = new Remote(dbusService._dbus, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
})

var service = new Service()

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
service.on('cancel', function (id) {
  logger.log('multimediad canceled', Array.prototype.slice.call(arguments, 0))
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'cancel']
  )
})
service.on('bufferingupdate', function (id) {
  logger.log('multimediad buffering update', Array.prototype.slice.call(arguments, 0))
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'bufferingupdate']
  )
})
service.on('seekcomplete', function (id) {
  logger.log('multimediad seek complete', Array.prototype.slice.call(arguments, 0))
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'seekcomplete']
  )
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
  in: ['s', 's', 's'],
  out: ['s']
}, function (appId, url, streamType, cb) {
  logger.log('multimedia play', appId, url, streamType)
  if (appId && url) {
    permit.invoke('check', [appId, 'ACCESS_MULTIMEDIA'])
      .then((res) => {
        if (res && res['0'] === 'true') {
          var id = service.start(appId, url, streamType)
          cb(null, '' + id)
        } else {
          logger.log('permission deny')
          cb(null, '-1')
        }
      })
      .catch((err) => {
        logger.log('multimedia play error', appId, url, err)
        logger.log('can not connect to vui')
        cb(null, '-1')
      })
  } else {
    logger.log('start: url and appId are required')
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
  out: ['b']
}, function (appId, cb) {
  logger.log('multimedia pause', appId)
  if (appId) {
    var playing = service.pause(appId)
    return cb(null, playing)
  }
  cb(null, false)
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
    service.seek(appId, +position, _.once((error) => {
      if (error) {
        cb(null, false)
      } else {
        cb(null, true)
      }
    }))
  } else {
    cb(null, false)
  }
})

dbusApis.addMethod('getLoopMode', {
  in: ['s', 's'],
  out: ['b']
}, function (appId, cb) {
  logger.log(`appId: ${appId} getLoopMode`)
  if (appId) {
    var mode = service.getLoopMode(appId)
    logger.log(`response: ${mode}`)
    cb(null, mode)
  } else {
    cb(null, false)
  }
})

dbusApis.addMethod('setLoopMode', {
  in: ['s', 's'],
  out: ['b']
}, function (appId, mode, cb) {
  logger.log(`appId: ${appId} setLoopMode: ${mode}`)
  if (appId) {
    service.setLoopMode(appId, mode)
    cb(null, true)
  } else {
    cb(null, false)
  }
})

dbusApis.addMethod('reset', {
  in: [],
  out: ['b']
}, function (cb) {
  logger.log('reset multimedia requested by vui')
  service.reset()
  cb(null, true)
})

logger.log('service multimedia started')
