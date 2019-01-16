'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/multimediad-err.log')

var _ = require('@yoda/util')._
var Service = require('./service')
var Flora = require('./flora')
var Dbus = require('dbus')
var logger = require('logger')('multimediad')
var Remote = require('../../lib/dbus-remote-call.js')

var dbusService = Dbus.registerService('session', 'com.service.multimedia')
var dbusObject = dbusService.createObject('/multimedia/service')
var dbusApis = dbusObject.createInterface('multimedia.service')

var lightd = new Remote(dbusService._dbus, {
  dbusService: 'com.service.light',
  dbusObjectPath: '/rokid/light',
  dbusInterface: 'com.rokid.light.key'
})

var service = new Service(lightd)
var flora = new Flora(service)
flora.init()

service.on('prepared', function (id, dur, pos) {
  logger.log('multimediad-event prepared', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssss',
    [id, 'prepared', dur, pos]
  )
})
service.on('pause', function (id, dur, pos) {
  logger.log('multimediad-event pause', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssss',
    [id, 'pause', dur, pos]
  )
})
service.on('resume', function (id, dur, pos) {
  logger.log('multimediad-event resume', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssss',
    [id, 'resume', dur, pos]
  )
})
service.on('playbackcomplete', function (id, dur, pos) {
  logger.log('multimediad-event playback complete', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'playbackcomplete']
  )
})
service.on('cancel', function (id, dur, pos) {
  logger.log('multimediad-event canceled', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'cancel']
  )
})
service.on('bufferingupdate', function (id, dur, pos) {
  logger.log('multimediad-event buffering update', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'bufferingupdate']
  )
})
service.on('seekcomplete', function (id, dur, pos) {
  logger.log('multimediad-event seek complete', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'seekcomplete']
  )
})
service.on('error', function (id) {
  logger.log('multimediad-event error', id)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'error']
  )
})

dbusApis.addMethod('prepare', {
  in: ['s', 's', 's'],
  out: ['s']
}, function (appId, url, streamType, cb) {
  logger.log('multimedia prepare', appId, url, streamType)
  if (appId && url) {
    var player
    try {
      player = service.prepare(appId, url, streamType)
    } catch (err) {
      logger.error(`Unexpected error on start multimedia for app ${appId}`, err.stack)
      return cb(null, '-1')
    }
    cb(null, '' + player.id)
  } else {
    logger.log('prepare: url and appId are required')
    cb(null, '-1')
  }
})

dbusApis.addMethod('start', {
  in: ['s', 's', 's'],
  out: ['s']
}, function (appId, url, streamType, cb) {
  logger.log('multimedia play', appId, url, streamType)
  if (appId && url) {
    var id
    try {
      id = service.start(appId, url, streamType)
    } catch (err) {
      logger.error(`Unexpected error on start multimedia for app ${appId}`, err.stack)
      return cb(null, '-1')
    }
    cb(null, '' + id)
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
  out: ['d']
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

dbusApis.addMethod('resetAwaken', {
  in: ['s'],
  out: ['b']
}, function (appId, cb) {
  var pausedAppIdOnAwaken = service.pausedAppIdOnAwaken
  service.pausedAppIdOnAwaken = null
  logger.log('reset awaken requested by vui', appId, '; paused app', pausedAppIdOnAwaken)
  if (pausedAppIdOnAwaken && appId === pausedAppIdOnAwaken) {
    service.resume(pausedAppIdOnAwaken)
  }
  cb(null, true)
})

logger.log('service multimedia started')
