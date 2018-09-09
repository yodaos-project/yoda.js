'use strict'

var test = require('tape')
var Cloudgw = require('@yoda/cloudgw')
var config

test('type check', (t) => {
  config = {
    'deviceId': 'XXX',
    'deviceTypeId': 'XXX',
    'key': 'XXX',
    'secret': 'XXX'
  }
  var cloudgw = new Cloudgw(config)
  t.equal(typeof cloudgw, 'object')
  t.end()
})

test('valid parameter', (t) => {
  config = {
    'deviceId': 'XXX',
    'deviceTypeId': 'XXX',
    'key': 'XXX',
    'secret': 'XXX'
  }
  t.doesNotThrow(() => { new Cloudgw(config) }, new RegExp('illegal parameter'), 'valid parameter')
  t.end()
})

test('illegal parameter', (t) => {
  // throws id：1325
  t.throws(() => { new Cloudgw(null) }, new RegExp('Expect a string on config.key.'), 'config is null')
  t.throws(() => { new Cloudgw({}) }, new RegExp('Expect a string on config.key.'), 'config is {}')

  config = {
    'deviceId': null,
    'deviceTypeId': 'XXX',
    'key': 'XXX',
    'secret': 'XXX'
  }
  t.throws(() => { new Cloudgw(config) }, new RegExp('Expect a string on config.deviceId.'), 'deviceId is null')

  config = {
    'deviceId': 'XXX',
    'deviceTypeId': null,
    'key': 'XXX',
    'secret': 'XXX'
  }
  t.throws(() => { new Cloudgw(config) }, new RegExp('Expect a string on config.deviceTypeId.'), 'deviceTypeId is null')

  config = {
    'deviceId': 'XXX',
    'deviceTypeId': 'XXX',
    'key': null,
    'secret': 'XXX'
  }
  t.throws(() => { new Cloudgw(config) }, new RegExp('Expect a string on config.key.'), 'key is null')

  config = {
    'deviceId': 'XXX',
    'deviceTypeId': 'XXX',
    'key': 'XXX',
    'secret': null
  }
  t.throws(() => { new Cloudgw(config) }, new RegExp('Expect a string on config.secret.'), 'secret is null')

  t.end()
})
