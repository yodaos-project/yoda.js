'use strict'

var test = require('tape')
var helper = require('../helper')
var env = require(`${helper.paths.runtime}/lib/env`)

test('should test the default config', t => {
  var env1 = env()
  t.assert(env1.cloudgw.account, 'device-account.rokid.com')
  t.assert(env1.cloudgw.wss, 'apigwws.open.rokid.com')
  t.assert(env1.cloudgw.restful, 'apigwrest.open.rokid.com')
  t.assert(env1.mqtt.registry, 'wormhole-registry.rokid.com')
  t.assert(env1.mqtt.uri, 'mqtts://wormhole.rokid.com:8885')
  t.end()
})

test('should test the dev config', t => {
  var env2 = env.load('dev')
  t.assert(env2.cloudgw.account, 'device-account-dev.rokid.com')
  t.assert(env2.cloudgw.wss, 'apigwws-dev.open.rokid.com')
  t.assert(env2.cloudgw.restful, 'apigwrest-dev.open.rokid.com')
  t.assert(env2.mqtt.registry, 'wormhole-registry.rokid.com')
  t.end()
})

test('should test undefined config', t => {
  var env3 = env.load('undefined')
  t.assert(env3.cloudgw.account, 'device-account.rokid.com')
  t.assert(env3.cloudgw.wss, 'apigwws.open.rokid.com')
  t.assert(env3.cloudgw.restful, 'apigwrest.open.rokid.com')
  t.assert(env3.mqtt.registry, 'wormhole-registry.rokid.com')
  t.end()
})
