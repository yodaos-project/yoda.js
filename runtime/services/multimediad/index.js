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
    'ssdd',
    [id, 'prepared', dur, pos]
  )
})
service.on('paused', function (id, dur, pos) {
  logger.log('multimediad-event pause', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssdd',
    [id, 'paused', dur, pos]
  )
})
service.on('resumed', function (id, dur, pos) {
  logger.log('multimediad-event resume', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssdd',
    [id, 'resumed', dur, pos]
  )
})
service.on('playbackcomplete', function (id, dur, pos) {
  logger.log('multimediad-event playback complete', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssdd',
    [id, 'playbackcomplete', dur, pos]
  )
})
service.on('cancel', function (id, dur, pos) {
  logger.log('multimediad-event canceled', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssdd',
    [id, 'cancel', dur, pos]
  )
})
service.on('bufferingupdate', function (id, dur, pos) {
  logger.log('multimediad-event buffering update', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssdd',
    [id, 'bufferingupdate', dur, pos]
  )
})
service.on('seekcomplete', function (id, dur, pos) {
  logger.log('multimediad-event seek complete', id, dur, pos)
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssdd',
    [id, 'seekcomplete', dur, pos]
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
  in: ['s', 's', 's', 's'],
  out: ['s']
}, function (appId, url, streamType, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = '{}'
  }
  logger.log('multimedia prepare', appId, url, streamType, options)
  if (appId && url) {
    var player
    try {
      options = JSON.parse(options)
      player = service.prepare(appId, url, streamType, options)
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
  in: ['s', 's', 's', 's'],
  out: ['s']
}, function (appId, url, streamType, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = '{}'
  }
  logger.log('multimedia play', appId, url, streamType, options)
  if (appId && url) {
    var id
    try {
      options = JSON.parse(options)
      id = service.start(appId, url, streamType, options)
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
  in: ['s', 's'],
  out: []
}, function (appId, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  logger.log('multimedia cancel', appId, playerId)
  if (appId) {
    service.stop(appId, +playerId)
  }
  cb(null)
})

dbusApis.addMethod('pause', {
  in: ['s', 's'],
  out: ['b']
}, function (appId, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  logger.log('multimedia pause', appId, playerId)
  if (appId) {
    var playing = service.pause(appId, +playerId)
    return cb(null, playing)
  }
  cb(null, false)
})

dbusApis.addMethod('resume', {
  in: ['s', 's'],
  out: []
}, function (appId, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  logger.log('multimedia resume', appId, playerId)
  if (appId) {
    service.resume(appId, +playerId)
  }
  cb(null)
})

dbusApis.addMethod('getPosition', {
  in: ['s', 's'],
  out: ['d']
}, function (appId, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  if (appId) {
    var pos = service.getPosition(appId, +playerId)
    cb(null, pos)
  } else {
    cb(null, -1)
  }
})

dbusApis.addMethod('seek', {
  in: ['s', 's', 's'],
  out: ['b']
}, function (appId, position, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  logger.log('seek', position, typeof position, playerId)
  if (appId && position !== '' && +position >= 0) {
    service.seek(appId, +position, +playerId, _.once((error) => {
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
}, function (appId, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  logger.log(`appId: ${appId} getLoopMode ${playerId}`)
  if (appId) {
    var mode = service.getLoopMode(appId, +playerId)
    logger.log(`response: ${mode}`)
    cb(null, mode)
  } else {
    cb(null, false)
  }
})

dbusApis.addMethod('setLoopMode', {
  in: ['s', 's', 's'],
  out: ['b']
}, function (appId, mode, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  logger.log(`appId: ${appId} setLoopMode: ${mode} ${playerId}`)
  if (appId) {
    service.setLoopMode(appId, mode, +playerId)
    cb(null, true)
  } else {
    cb(null, false)
  }
})

dbusApis.addMethod('getEqMode', {
  in: ['s', 's'],
  out: ['d']
}, function (appId, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  logger.log(`appId: ${appId} getEqMode ${playerId}`)
  if (appId) {
    var mode = service.getEqMode(appId, +playerId)
    logger.log(`response: ${mode}`)
    cb(null, mode)
  } else {
    cb(null, 0)
  }
})

dbusApis.addMethod('setEqMode', {
  in: ['s', 's', 's'],
  out: ['b']
}, function (appId, mode, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  mode = parseInt(mode)
  logger.log(`appId: ${appId} setEqMode: ${mode}, ${typeof mode} ${playerId}`)
  if (appId && !isNaN(mode)) {
    service.setEqMode(appId, mode, +playerId)
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

dbusApis.addMethod('getState', {
  in: ['s', 's'],
  out: ['s']
}, function (appId, playerId, cb) {
  if (typeof playerId === 'function') {
    cb = playerId
    playerId = -1
  }
  var state = service.getState(appId, +playerId)
  var position = service.getPosition(appId, +playerId)
  var duration = service.getDuration(appId, +playerId)
  var result = {
    state: state,
    position: position,
    duration: duration
  }
  cb(null, JSON.stringify(result))
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

dbusApis.addMethod('setSpeed', {
  in: ['s', 's', 's'],
  out: ['b']
}, function (appId, speed, playerId, cb) {
  logger.log(`set play speed, ${appId} ${speed}`)
  service.setSpeed(appId, speed, +playerId)
  cb(null, true)
})

logger.log('service multimedia started')
