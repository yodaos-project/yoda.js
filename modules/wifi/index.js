'use strict';

const WifiWrap = require('bindings')('wifi').WifiWrap;
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
      console.log(s);
      if (s === 'connected') {
        wifi.save();
        clearInterval(check);
        callback(null, 'connected');
      } else if (times >= 10) {
        clearInterval(check);
        callback(new Error('Network timeout'));
      } else {
        times += 1;
      }
    }, 500);
  });
};

function disconnect() {
  return wifi.disconnect();
}

function status() {
  return STATES[wifi.getStatus()];
};

exports.connect = connect;
exports.disconnect = disconnect;
exports.status = exports.getStatus = status;
