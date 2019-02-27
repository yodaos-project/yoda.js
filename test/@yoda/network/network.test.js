'use strict'

var test = require('tape')
var network = require('@yoda/network')
var Mock = require('./mock.js')

test('test wifi operations', function (t) {
  var networkAgent = new network.NetworkAgent()
  networkAgent._flora.deinit()
  networkAgent._flora = new Mock()

  networkAgent.connectWifi('test', 'passwd').then((reply) => {
    t.equal(reply.result, 'OK')
    return networkAgent.getWifiStatus()
  }).then((reply) => {
    t.equal(reply.result, 'OK')
    t.equal(reply.wifi.state, 'CONNECTED')
    networkAgent.disconnectWifi()
    return networkAgent.getWifiStatus()
  }).then((reply) => {
    t.equal(reply.wifi.state, 'DISCONNECTED')
    t.end()
  })
})
