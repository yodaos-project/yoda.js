'use strict'

var test = require('tape')
var wifi = require('@yoda/wifi')
var logger = require('logger')('wifi')

test('type check', function (t) {
  // Members
  t.equal(typeof wifi.NETSERVER_CONNECTED, 'number')
  t.equal(typeof wifi.NETSERVER_UNCONNECTED, 'number')
  t.equal(typeof wifi.WIFI_CONNECTED, 'number')
  t.equal(typeof wifi.WIFI_INIVATE, 'number')
  t.equal(typeof wifi.WIFI_SCANING, 'number')
  t.equal(typeof wifi.WIFI_UNCONNECTED, 'number')

  // Methods
  t.equal(typeof wifi.joinNetwork('ROKID.TC', 'rokidguys'), 'number')
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
  wifi.joinNetwork('ROKID.TC', 'rokidguys')
  logger.log('start connect, sleep 10s...')
  setTimeout(() => {
    t.equal(wifi.getWifiState(), wifi.WIFI_CONNECTED)
    t.equal(wifi.getNetworkState(), wifi.NETSERVER_CONNECTED)
    t.end()
  }, 10000)
})

// Return Check id:1308
test('Check the return value of the function joinNetwork/useful data', (t) => {
  t.equal(wifi.joinNetwork('ROKID.TC', 'rokidguys'), 0)
  t.end()
})

test('joinNetwork: illegal parameter', (t) => {
  t.plan(4)
  t.throws(() => { wifi.joinNetwork(null, 'rokidguys') }, new RegExp('ssid must be a string'), 'The ssid is null')
  t.doesNotThrow(() => { wifi.joinNetwork('ROKID.TC', null) }, new RegExp('join network failed'), 'the passwords is null')

  t.throws(() => { wifi.joinNetwork(123456, 'rokidguys') }, new RegExp('ssid must be a string'), 'The ssid is not a string but not null')
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
test.skip('Check the return value of the function disableAll', (t) => {
  t.assert(wifi.disableAll(), true)
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
