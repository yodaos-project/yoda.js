'use strict';

const BluetoothWrap = require('bindings')('bluetooth').BluetoothWrap;
const handle = new BluetoothWrap();

let ble_is_opened = false;
let a2dp_is_opened = false;

/**
 * @method open
 * @param {String} name - the bluetooth name
 */
exports.open = function(name) {
  if (ble_is_opened === true)
    ble.close();
  handle.open(name || 'Rokid DevBoard');
  a2dp_is_opened = true;
};

/**
 * @method close
 */
exports.close = function() {
  handle.close();
  a2dp_is_opened = false;
};

/**
 * @method play
 */
exports.play = function() {
  if (a2dp_is_opened)
    handle.sendCommand(1);
};

/**
 * @method pause
 */
exports.pause = function() {
  if (a2dp_is_opened)
    handle.sendCommand(2);
};

/**
 * @method playNext
 */
exports.playNext = function() {
  if (a2dp_is_opened)
    handle.sendCommand(3);
};

/**
 * @method playPrev
 */
exports.playPrev = function() {
  if (a2dp_is_opened)
    handle.sendCommand(4);
};

/**
 * @method a2dp
 * @param {String} type - sink or link
 */
exports.a2dp = function(type) {
  if (type === 'sink')
    return handle.enableA2DPSink();
  else if (type === 'link')
    return handle.enableA2DPLink();
  else
    return handle.enableA2DP();
};

/**
 * @class BluetoothLowEnergy
 */
class BluetoothLowEnergy {
  /**
   * @method open
   */
  open(name) {
    if (a2dp_is_opened === true)
      clse();
    handle.enableBLE(name || 'Rokid DevBoard');
    ble_is_opened = true;
    return this;
  }
  /**
   * @method close
   */
  close() {
    handle.disableBLE();
    ble_is_opened = false;
  }
  /**
   * @method onResp
   * @param {Function} callback
   */
  onResp(callback) {
    handle.getBleResp(callback);
  }
  /**
   * @method write
   * @param {String} data
   */
  write(data) {
    handle.sendBleResp(data);
  }
}

// we use a globally BLE instance
let ble = new BluetoothLowEnergy();

/**
 * @method ble
 * @param {String} name - the BLE name
 */
exports.ble = function(name) {
  if (ble_is_opened === true)
    ble.close();
  return ble.open(name);
};
