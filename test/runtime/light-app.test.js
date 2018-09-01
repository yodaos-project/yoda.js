'use strict'

var test = require('tape')
var path = require('path')
var EventEmitter = require('events')

var Descriptors = require('/usr/lib/yoda/runtime/lib/app/activity-descriptor')
var lightApp = require('/usr/lib/yoda/runtime/lib/app/light-app')
var proxy = require('../fixture/simple-app').proxy

var target = path.join(__dirname, '..', 'fixture', 'simple-app')
var ActivityDescriptor = Descriptors.ActivityDescriptor
var MultimediaDescriptor = Descriptors.MultimediaDescriptor

test('should listen events', t => {
  var runtime = new EventEmitter()

  var descriptor = lightApp('@test', target, runtime)

  var activityEvents = Object.keys(ActivityDescriptor.prototype).filter(key => {
    var desc = ActivityDescriptor.prototype[key]
    return desc.type === 'event'
  })
  var multimediaEvents = Object.keys(MultimediaDescriptor.prototype).filter(key => {
    var desc = MultimediaDescriptor.prototype[key]
    return desc.type === 'event'
  })

  activityEvents.forEach(it => {
    t.assert(descriptor.listeners(it).length > 0, `event '${it}' should have been listened.`)
  })
  multimediaEvents.forEach(it => {
    t.assert(descriptor.media.listeners(it).length > 0, `media event '${it}' should have been listened.`)
  })

  t.end()
  proxy.removeAllListeners()
})

test('should subscribe event-ack', t => {
  var runtime = new EventEmitter()
  var descriptor = lightApp('@test', target, runtime)

  var activityEvents = Object.keys(ActivityDescriptor.prototype).filter(key => {
    var desc = ActivityDescriptor.prototype[key]
    return desc.type === 'event-ack'
  })

  activityEvents.forEach(it => {
    var eventDescriptor = descriptor[it]
    t.strictEqual(typeof descriptor[eventDescriptor.trigger], 'function',
      `event-ack '${it}' should have been subscribed.`)
  })

  t.end()
  proxy.removeAllListeners()
})

test('should receive life cycle events', t => {
  t.plan(6)
  proxy.on('create', () => {
    t.pass('event `created` received')
  })
  proxy.on('pause', () => {
    t.pass('event `paused` received')
  })
  proxy.on('resume', () => {
    t.pass('event `resumed` received')
  })
  proxy.on('destroy', () => {
    t.pass('event `destroyed` received')
  })

  var nlp = { intent: { } }
  var action = { appId: '@test' }
  proxy.on('request', (gotNlp, gotAction) => {
    t.strictEqual(gotNlp, nlp, 'nlp comparison')
    t.strictEqual(gotAction, action, 'action comparison')
  })
  var app = lightApp('@test', target, {})
  app.emit('create')
  app.emit('pause')
  app.emit('resume')
  app.emit('destroy')
  app.emit('request', nlp, action)

  t.end()
  proxy.removeAllListeners()
})

test('should populate methods', t => {
  var app = lightApp('@test', target, {})
  var activity = app.activity

  var activityMethods = [ 'destroyAll', 'exit', 'get',
    'playSound', 'setBackground', 'setConfirm', 'setForeground', 'setPickup' ]
  activityMethods.forEach(it => {
    t.strictEqual(typeof activity[it], 'function', `activity.${it} has to be a function`)
  })

  var namespaces = {
    light: [ 'play', 'stop' ],
    media: [ 'getLoopMode', 'getPosition', 'pause', 'resume', 'seek',
      'setLoopMode', 'start', 'stop' ],
    tts: [ 'speak', 'stop' ]
  }
  Object.keys(namespaces).forEach(key => {
    var ns = namespaces[key]
    t.strictEqual(typeof activity[key], 'object', `activity.${key} has to be an object`)
    ns.forEach(it => {
      t.strictEqual(typeof activity[key][it], 'function', `activity.${key}.${it} has to be a function`)
    })
  })

  t.end()
  proxy.removeAllListeners()
})

test('should populate direct values', t => {
  var app = lightApp('@test', target, {})
  var activity = app.activity
  t.strictEqual(activity.appId, '@test')
  t.strictEqual(activity.appHome, target)
  t.end()
  proxy.removeAllListeners()
})
