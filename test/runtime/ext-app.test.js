'use strict'

var test = require('tape')
var path = require('path')
var EventEmitter = require('events')

var helper = require('../helper')
var Descriptors = require(`${helper.paths.runtime}/lib/app/activity-descriptor`)
var extApp = require(`${helper.paths.runtime}/lib/app/ext-app`)

var ActivityDescriptor = Descriptors.ActivityDescriptor
var MultimediaDescriptor = Descriptors.MultimediaDescriptor

Object.assign(ActivityDescriptor.prototype, {
  testMethod: {
    type: 'method',
    returns: 'promise',
    fn: function testMethod () {
      return this._runtime.testMethod.apply(this._runtime, arguments)
    }
  },
  'test-ack': {
    type: 'event-ack',
    trigger: 'onTestAck'
  }
})

test('should listen events', t => {
  var target = path.join(helper.paths.fixture, 'simple-app')

  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
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

      descriptor.destruct()
      t.end()
    }, err => {
      t.error(err)
      t.end()
    })
})

test('should subscribe event-ack', t => {
  var target = path.join(helper.paths.fixture, 'simple-app')

  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
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

      descriptor.destruct()
      t.end()
    }, err => {
      t.error(err)
      t.end()
    })
})

test('should trigger events and pass arguments', t => {
  t.plan(2)
  var target = path.join(helper.paths.fixture, 'ext-app')

  var nlp = { foo: 'bar' }
  var action = { appId: '@test' }
  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
    .then(descriptor => {
      descriptor.emit('request', nlp, action)
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        t.strictEqual(message.event, 'request')
        t.deepEqual(message.args, [ nlp, action ])

        descriptor.destruct()
      })
    })
})

test('should trigger events in namespaces and pass arguments', t => {
  t.plan(3)
  var target = path.join(helper.paths.fixture, 'ext-app')

  var arg1 = { foo: 'bar' }
  var arg2 = { appId: '@test' }
  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
    .then(descriptor => {
      descriptor.tts.emit('end', arg1, arg2)
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        t.strictEqual(message.namespace, 'tts')
        t.strictEqual(message.event, 'end')
        t.deepEqual(message.args, [ arg1, arg2 ])

        descriptor.destruct()
      })
    })
})

test('should trigger events and acknowledge it', t => {
  t.plan(5)
  var target = path.join(helper.paths.fixture, 'ext-app')

  var nlp = { foo: 'bar' }
  var action = { appId: '@test' }
  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
    .then(descriptor => {
      var promise
      var err
      try {
        promise = descriptor.onTestAck(nlp, action)
          .then(() => {
            t.pass('event ack resolved')
          }, err => t.error(err))
      } catch (error) {
        err = error
      }

      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        t.strictEqual(message.event, 'test-ack')
        t.deepEqual(message.args, [ nlp, action ])

        descriptor.destruct()
      })

      t.assert(typeof promise === 'object', 'onTestAck should return a promise')
      t.error(err, 'should not thrown on onTestAck')
    })
})

test('should invoke methods and callback', t => {
  t.plan(3)
  var target = path.join(helper.paths.fixture, 'ext-app')

  var expectedData = { foo: 'bar' }
  var runtime = {
    testMethod: function testMethod (arg1, arg2) {
      t.strictEqual(arg1, 'foo')
      t.strictEqual(arg2, 'bar')
      return Promise.resolve(expectedData)
    }
  }
  extApp('@test', target, runtime)
    .then(descriptor => {
      descriptor.emit('create')
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test' || message.event !== 'create') {
          return
        }
        var data = message.data
        t.deepEqual(data, expectedData)
        descriptor.destruct()
      })
    })
})
