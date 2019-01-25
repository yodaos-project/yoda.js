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
  },
  'httpgw-test': {
    type: 'event'
  }
})

var target = path.join(helper.paths.fixture, 'ext-app')

test('http.getSignature should return sign', t => {
  var props = {
    masterId: 'foobar',
    key: 'key',
    secret: 'very-secret-secret',
    deviceId: 'id',
    deviceTypeId: 'type_id'
  }
  var runtime = {
    onGetPropAll: () => props
  }
  var opts = {
    service: 'example'
  }
  extApp('@test/app-id', { appHome: target }, runtime)
    .then(descriptor => {
      descriptor.emit('httpgw-test', 'getSignature', [opts])
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        t.deepEqual(message.event, 'httpgw-test')
        var sign = message.result.split(';')
        t.equal(/version=1/.test(sign[0]), true)
        t.equal(/time=/.test(sign[1]), true)
        t.equal(/sign=/.test(sign[2]), true)
        t.equal(/key=/.test(sign[3]), true)
        t.equal(/device_type_id=type_id/.test(sign[4]), true)
        t.equal(/device_id=id/.test(sign[5]), true)
        t.equal(/service=example/.test(sign[6]), true)
        descriptor.destruct()
        t.end()
      })
    })
})
