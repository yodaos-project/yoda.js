'use strict'

var test = require('tape')
var path = require('path')

var helper = require('../../helper')
var Cloudgw = require('@yoda/cloudgw')
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
  t.plan(1)
  var props = {
    masterId: 'foobar',
    key: 'a-key',
    secret: 'very-secret-secret',
    deviceId: 'id',
    deviceTypeId: 'type id'
  }
  var runtime = {
    onGetPropAll: () => props
  }
  var opts = {
    service: 'example'
  }
  var cloudapi = new Cloudgw(props)
  var expected = Cloudgw.getAuth(Object.assign({}, opts, cloudapi.config))

  extApp('@test/app-id', { appHome: target }, runtime)
    .then(descriptor => {
      descriptor.emit('httpgw-test', 'getSignature', [opts])
      descriptor._childProcess.on('message', message => {
        t.deepEqual(message.result, expected)
        descriptor.destruct()
      })
    })
})
