'use strict'

var test = require('tape')
var wifi = require('@yoda/wifi')
var logger = require('logger')('wifi')
var config = require('../../config.json').wifi

test('type check', function (t) {
  // Members
  t.equal(typeof wifi.NETSERVER_CONNECTED, 'number')
  t.equal(typeof wifi.NETSERVER_UNCONNECTED, 'number')
  t.equal(typeof wifi.WIFI_CONNECTED, 'number')
  t.equal(typeof wifi.WIFI_INIVATE, 'number')
  t.equal(typeof wifi.WIFI_SCANING, 'number')
  t.equal(typeof wifi.WIFI_UNCONNECTED, 'number')

  // Methods
  t.equal(typeof wifi.joinNetwork(config.ssid, config.psk), 'number')
  t.equal(typeof wifi.getWifiState(), 'number')
  t.equal(typeof wifi.getNetworkState(), 'number')
  t.equal(typeof wifi.getWifiList(), 'object')
  t.equal(typeof wifi.disableAll(), 'number')
  t.equal(typeof wifi.resetDns(), 'boolean')
  t.equal(typeof wifi.scan(), 'boolean')
  t.equal(typeof wifi.save(), 'boolean')

  t.end()
})

// State Check
test('scaning', (t) => {
  wifi.disableAll()
  wifi.scan()
  setTimeout(() => {
    t.equal(wifi.getWifiState(), wifi.WIFI_SCANING)
    t.end()
  }, 500)
})

// the state is not stable, pass
test.skip('wifi unconnected and netserver unconnected', (t) => {
  wifi.disableAll()
  t.equal(wifi.getWifiState(), wifi.WIFI_UNCONNECTED)
  t.equal(wifi.getNetworkState(), wifi.NETSERVER_UNCONNECTED)
  t.end()
})

// It takes too much time and the state is not stable, pass
test.skip('wifi connected and netserver connected', (t) => {
  wifi.disableAll()
  wifi.resetDns()
  wifi.joinNetwork(config.ssid, config.psk)
  logger.log('start connect, sleep 10s...')
  setTimeout(() => {
    t.equal(wifi.getWifiState(), wifi.WIFI_CONNECTED)
    t.equal(wifi.getNetworkState(), wifi.NETSERVER_CONNECTED)
    t.end()
  }, 10000)
})

// Return Check id:1308
test('Check the return value of the function joinNetwork/useful data', (t) => {
  t.equal(typeof wifi.joinNetwork(config.ssid, config.psk), 'number')
  t.end()
})

test('joinNetwork: illegal parameter', (t) => {
  t.plan(4)
  t.throws(() => { wifi.joinNetwork(null, '88888888') }, new RegExp('ssid must be a string'), 'The ssid is null')
  t.doesNotThrow(() => { wifi.joinNetwork(config.ssid, null) }, new RegExp('join network failed'), 'the passwords is null')

  t.throws(() => { wifi.joinNetwork(123456, '88888888') }, new RegExp('ssid must be a string'), 'The ssid is not a string and not null')
  t.throws(() => { wifi.joinNetwork('ROKID.TC', '1234567') }, new RegExp('join network failed'), 'The number of passwords is less than 7')
  t.end()
})

test('Check the return value of the function getWifiList', (t) => {
  wifi.scan()
  var list = wifi.getWifiList()
  t.assert(Array.isArray(list), true, 'list should be an array')
  t.end()
})

// id:1309
test('Check the return type of the function disableAll', (t) => {
  t.assert(typeof wifi.disableAll(), 'number')
  t.end()
})

test('Check the return value of the function resetDns', (t) => {
  t.assert(wifi.resetDns(), true)
  t.end()
})

test('Check the return value of the function save', (t) => {
  t.assert(wifi.save(), true)
  t.end()
})
