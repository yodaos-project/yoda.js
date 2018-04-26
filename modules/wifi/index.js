'use strict';

const binding = require('bindings')('wifi');
const WifiWrap = binding.WifiWrap;
const logger = require('@rokid/logger')('wifi');
const wifi = new WifiWrap();
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
  'netserver_connected',
  'netserver_disconnected',
];

function connect(ssid, psk, method, callback) {
  if (!psk)
    method = KEY_MGMT.NONE;

  return wifi.connect(ssid, psk, method || KEY_MGMT.WPA2PSK, () => {
    if (typeof callback !== 'function')
      return;
    let times = 0;
    let check = setInterval(() => {
      const s = status();
      logger.log('network status:', s);
      if (s === 'netserver_connected') {
        wifi.save();
        clearInterval(check);
        callback(null, 'connected');
      } else if (times > 6) {
        clearInterval(check);
        callback(new Error('Network timeout'));
        times = 0;
      } else {
        times += 1;
      }
    }, 1000);
  });
};

function disconnect() {
  return wifi.disconnect();
}

function save() {
  return wifi.save();
}

function status() {
  return STATES[wifi.getStatus()];
}

function res_init() {
  return wifi.res_init();
}

exports.connect = connect;
exports.disconnect = disconnect;
exports.save = save;
exports.status = exports.getStatus = status;
exports.res_init = res_init;
