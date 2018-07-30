'use strict';

var bluetooth = require('./').getBluetooth('Rokid-Pebble-test');
bluetooth.enable('ble');
bluetooth.on('ble open', () => {
  console.log('open ble');
});
bluetooth.on('ble close', () => {
  console.log('ble closed');
});
bluetooth.on('ble data', (message) => {
  // message.protocol: means which protocol is used
  // message.data: means data
  console.log(JSON.stringify(message, null, 2));
});

