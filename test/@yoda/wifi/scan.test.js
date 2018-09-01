'use strict'

var test = require('tape')
var wifi = require('@yoda/wifi')

test.skip('scan and fetch the available list', function (t) {
  wifi.scan()
  var list = wifi.getWifiList()
  t.assert(Array.isArray(list), true, 'list should be an array')
  t.end()
})
