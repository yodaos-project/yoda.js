'use strict'

var test = require('tape')
var path = require('path')

var helper = require('../helper')
var Descriptors = require(`${helper.paths.runtime}/lib/descriptor`)
var extApp = require(`${helper.paths.runtime}/lib/app/ext-app`)

var ActivityDescriptor = Descriptors.ActivityDescriptor
Object.assign(ActivityDescriptor.prototype, {
  'test-invoke': {
    type: 'event'
  },
  'test-get': {
    type: 'event'
  }
})

var target = path.join(helper.paths.fixture, 'ext-app')

test('appId should be populated as direct value', t => {
  t.plan(2)

  var runtime = {}
  extApp('@test/app-id', { appHome: target }, runtime)
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

test('get should return properties', t => {
  t.plan(1)

  var expected = {
    masterId: 'foobar',
    key: 'a-key',
    secret: 'very-secret-secret'
  }
  var runtime = {
    getCopyOfCredential: function getCopyOfCredential () {
      return Promise.resolve(expected)
    }
  }
  extApp('@test/app-id', { appHome: target }, runtime)
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
