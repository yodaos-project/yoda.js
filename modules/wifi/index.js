'use strict';

const VolumeWrap = require('bindings')('wifi').WifiWrap;
const wifi = new VolumeWrap();
const KEY_MGMT = {
  'WPA2PSK': 0,
  'WPAPSK': 1,
  'WEP': 2,
  'NONE': 3,
};

const STATES = [
  'invalid',
  'scanning',
  'connected',
  'disconnected',
];

exports.connect = function(ssid, psk, method) {
  return wifi.connect(ssid, psk, method || KEY_MGMT.WPA2PSK);
};

exports.getStatus = function() {
  return STATES[wifi.getStatus()];
};
