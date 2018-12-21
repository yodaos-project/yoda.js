'use strict'

var test = require('tape')
var path = require('path')
var EventEmitter = require('events')

var helper = require('../helper')
var Descriptors = require(`${helper.paths.runtime}/lib/descriptor`)
var lightApp = require(`${helper.paths.runtime}/lib/app/light-app`)
var proxy = require('../fixture/simple-app').proxy

var target = path.join(helper.paths.fixture, 'simple-app')
var ActivityDescriptor = Descriptors.ActivityDescriptor

Object.assign(ActivityDescriptor.prototype, {
  'test-invoke': {
    type: 'event'
  },
  'test-ack': {
    type: 'event-ack',
    trigger: 'onTestAck'
  }
})

test('should listen no events if no listener presents', t => {
  proxy.removeAllListeners()
  var runtime = new EventEmitter()
  lightApp('@test', { appHome: path.join(helper.paths.fixture, 'noop-app') }, runtime)
    .then(descriptor => {
      t.strictEqual(descriptor.listeners().length, 0)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should listen events in need', t => {
  proxy.removeAllListeners()
  var runtime = new EventEmitter()
  lightApp('@test', { appHome: target }, runtime)
    .then(descriptor => {
      ;['create', 'pause', 'resume', 'destroy', 'request'].forEach(it => {
        t.assert(descriptor.listeners(it).length > 0, `listener of '${it}' shall presents.`)
      })
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should listen events in nested namespaces in need', t => {
  proxy.removeAllListeners()
  var runtime = new EventEmitter()
  lightApp('@test', { appHome: target }, runtime)
    .then(descriptor => {
      t.assert(descriptor.tts.listeners('end').length > 0, `listener of 'tts.end' shall presents.`)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should subscribe event-ack', t => {
  proxy.removeAllListeners()
  t.plan(3)
  var runtime = new EventEmitter()

  proxy.on('test-ack', (arg1, arg2) => {
    t.strictEqual(arg1, 'arg1')
    t.strictEqual(arg2, 'arg2')
  })

  lightApp('@test', { appHome: target }, runtime)
    .then(descriptor => {
      var eventDescriptor = ActivityDescriptor.prototype['test-ack']

      t.strictEqual(typeof descriptor[eventDescriptor.trigger], 'function',
        `event-ack test-ack should have been subscribed.`)

      return descriptor[eventDescriptor.trigger]('arg1', 'arg2')
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should test-invoke', t => {
  proxy.removeAllListeners()
  t.plan(3)
  var runtime = new EventEmitter()
  runtime.setPickup = function setPickup (pickup, duration) {
    t.strictEqual(pickup, 'arg1')
    t.strictEqual(duration, 'arg2')
  }
  lightApp('@test', { appHome: target }, runtime)
    .then(descriptor => {
      proxy.on('test', event => {
        if (event.event !== 'invoke') {
          return
        }
        t.looseEqual(event.result, null)
        t.end()
      })
      descriptor.emit('test-invoke', 'setPickup', [ 'arg1', 'arg2' ])
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

  var nlp = { intent: {} }
  var action = { appId: '@test' }
  proxy.on('request', (gotNlp, gotAction) => {
    t.strictEqual(gotNlp, nlp, 'nlp comparison')
    t.strictEqual(gotAction, action, 'action comparison')
  })
  lightApp('@test', { appHome: target }, {})
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
  lightApp('@test', { appHome: target }, {})
    .then(app => {
      var activity = app.activity

      var activityMethods = [ 'exit', 'get',
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
  lightApp('@test', { appHome: target }, {})
    .then(app => {
      var activity = app.activity
      t.strictEqual(activity.appId, '@test')
      t.strictEqual(activity.appHome, target)
      t.end()
    })
})
