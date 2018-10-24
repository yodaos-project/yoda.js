'use strict'

var it = require('tape')
var helper = require('../helper')
var CloudStore = require(`${helper.paths.runtime}/lib/cloudapi`)

it('should login with notify', function (t) {
  var cloudapi = new CloudStore({
    disableMqtt: true,
    notify: (code, msg) => {
      console.log(`got notified at ${code} ${msg}`)
    }
  })
  cloudapi.connect().then(() => {
    t.end()
  })
})

it('should handle different response', function (t) {
  var cloudapi = new CloudStore({
    disableMqtt: true,
    notify: (code, msg) => false
  })

  var data = {
    deviceId: 'deviceId',
    deviceTypeId: 'deviceTypeId',
    key: 'key',
    secret: 'secret',
    extraInfo: {
      basic_info: '{"master":"test"}'
    }
  }
  cloudapi.handleResponse(data)
  t.equal(cloudapi.apiAvailable, true, 'api should be available after response')
  t.equal(cloudapi.config.masterId, 'test')
  t.equal(cloudapi.config.deviceId, data.deviceId)
  t.equal(cloudapi.config.deviceTypeId, data.deviceTypeId)
  t.equal(cloudapi.config.key, data.key)
  t.equal(cloudapi.config.secret, data.secret)
  t.end()
})

it('should throw master id is required', function (t) {
  var cloudapi = new CloudStore({
    disableMqtt: true,
    notify: (code, msg) => false
  })

  var data = {
    deviceId: 'deviceId',
    deviceTypeId: 'deviceTypeId',
    key: 'key',
    secret: 'secret',
    extraInfo: {
      basic_info: '{}'
    }
  }

  t.plan(3)
  try {
    cloudapi.handleResponse(data)
  } catch (err) {
    t.equal(err.code, 'BIND_MASTER_REQUIRED')
  }
  t.equal(cloudapi.apiAvailable, false, 'api should not be available if no master')
  t.equal(cloudapi.config.masterId, null)
})

it('should request mqtt token', function (t) {
  var cloudapi = new CloudStore({
    disableMqtt: true,
    notify: (code, msg) => {
      console.log(`got notified at ${code} ${msg}`)
    }
  })
  cloudapi.connect().then(() => {
    cloudapi.requestMqttToken().then((data) => {
      t.equal(data.hasOwnProperty('username'), true, 'data should own "username"')
      t.equal(data.hasOwnProperty('token'), true, 'data should own "token"')
      t.equal(data.hasOwnProperty('expireTime'), true, 'data should own "expireTime"')
      t.equal(data.expireTime * 1000 > Date.now(), true, 'the expireTime should larger than now')
      t.end()
    })
  })
})
