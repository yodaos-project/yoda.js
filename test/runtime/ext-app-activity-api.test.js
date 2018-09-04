'use strict'

var test = require('tape')
var path = require('path')

var Descriptors = require('/usr/lib/yoda/runtime/lib/app/activity-descriptor')
var extApp = require('/usr/lib/yoda/runtime/lib/app/ext-app')

var ActivityDescriptor = Descriptors.ActivityDescriptor
Object.assign(ActivityDescriptor.prototype, {
  'test-invoke': {
    type: 'event'
  },
  'test-get': {
    type: 'event'
  }
})

var target = path.join(__dirname, '..', 'fixture', 'ext-app')

test('appId should be populated as direct value', t => {
  t.plan(2)

  var runtime = {}
  extApp('@test/app-id', target, runtime)
    .then(descriptor => {
      descriptor.emit('test-get', 'appId')
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        var result = message.result
        t.strictEqual(message.typeof, 'string')
        t.strictEqual(result, '@test/app-id')
        descriptor.destruct()
      })
    })
})

test('setPickup should be invoked with two arguments', t => {
  t.plan(1)

  var runtime = {
    setPickup: function setPickup (pickup, duration) {
      return Promise.resolve([ pickup, duration ])
    }
  }
  extApp('@test/app-id', target, runtime)
    .then(descriptor => {
      descriptor.emit('test-invoke', 'setPickup', [ true, 1024 ])
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        var result = message.result
        t.deepEqual(result, [ true, 1024 ])
        descriptor.destruct()
      })
    })
})

test('get should return properties', t => {
  t.plan(1)

  var expected = {
    masterId: 'foobar',
    key: 'a-key',
    secret: 'very-secret-secret'
  }
  var runtime = {
    onGetPropAll: function onGetPropAll () {
      return Promise.resolve(expected)
    }
  }
  extApp('@test/app-id', target, runtime)
    .then(descriptor => {
      descriptor.emit('test-invoke', 'get', [ 'all' ])
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        var result = message.result
        t.deepEqual(result, expected)
        descriptor.destruct()
      })
    })
})
