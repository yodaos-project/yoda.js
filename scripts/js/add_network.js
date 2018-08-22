'use strict'

var wifi = require('wifi')
var ssid = process.argv[2]
var psk = process.argv[3]

if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
  console.error('skip, the network has been configured')
} else {
  wifi.joinNetwork(ssid, psk)
}
