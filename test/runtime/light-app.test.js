'use strict'

var test = require('tape')
var path = require('path')
var EventEmitter = require('events')

var helper = require('../helper')
var Descriptors = require(`${helper.paths.runtime}/lib/app/activity-descriptor`)
var lightApp = require(`${helper.paths.runtime}/lib/app/light-app`)
var proxy = require('../fixture/simple-app').proxy

var target = path.join(helper.paths.fixture, 'simple-app')
var ActivityDescriptor = Descriptors.ActivityDescriptor
var MultimediaDescriptor = Descriptors.MultimediaDescriptor

test('should listen events', t => {
  proxy.removeAllListeners()
  var runtime = new EventEmitter()

  lightApp('@test', target, runtime)
    .then(descriptor => {
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
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should subscribe event-ack', t => {
  proxy.removeAllListeners()
  var runtime = new EventEmitter()
  lightApp('@test', target, runtime)
    .then(descriptor => {
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
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should receive life cycle events', t => {
  proxy.removeAllListeners()
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
  lightApp('@test', target, {})
    .then(app => {
      app.emit('create')
      app.emit('pause')
      app.emit('resume')
      app.emit('destroy')
      app.emit('request', nlp, action)

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should populate methods', t => {
  proxy.removeAllListeners()
  lightApp('@test', target, {})
    .then(app => {
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
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should populate direct values', t => {
  proxy.removeAllListeners()
  lightApp('@test', target, {})
    .then(app => {
      var activity = app.activity
      t.strictEqual(activity.appId, '@test')
      t.strictEqual(activity.appHome, target)
      t.end()
    })
})
