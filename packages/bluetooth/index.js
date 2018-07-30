'use strict';

/**
 * @namespace bluetooth
 */

var Bluetooth = require('./bluetooth.node').Bluetooth;
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var global_bt = null;

/**
 * @constructor
 * @param {Object} name - the bluetooth name
 */
function BluetoothAgent(name) {
  EventEmitter.call(this);
  this._name = name || 'yoda';
  this._handle = new Bluetooth(this._name);
  this._handle.onevent = this.onevent.bind(this);
  this._handle.ondiscovery = this.ondiscovery.bind(this);
}
inherits(BluetoothAgent, EventEmitter);

/**
 * onevent
 */
BluetoothAgent.prototype.onevent = function() {
  // TODO
};

/**
 * ondiscovery
 */
BluetoothAgent.prototype.ondiscovery = function() {
  // TODO
};

/**
 * enable
 * @param {String} name - the bluetooth module name, like "ble", "a2dp".
 */
BluetoothAgent.prototype.enable = function(name) {
  if (name === 'ble') {
    this._handle.enableBle();
  } else {
    this.emit('error', new Error(`bluetooth module ${name} not support`));
  }
};

/**
 * disable
 * @param {String} name - the bluetooth module name, like "ble", "a2dp".
 */
BluetoothAgent.prototype.disable = function(name) {
  if (name === 'ble') {
    this._handle.disableBle();
  } else {
    this.emit('error', new Error(`bluetooth module ${name} not support`));
  }
};

/**
 * setName
 * @param {String} val
 */
BluetoothAgent.prototype.setName = function(val) {
  this._handle.setName(val);
};

/**
 * @property {Object} enabled
 * @readable
 */
Object.defineProperty(BluetoothAgent.prototype, 'enabled', {
  get: function() {
    return {
      ble: this._handle.bleEnabledGetter(),
    };
  }
});

/**
 * @memberof bluetooth
 * @method getBluetooth
 * @param {Object} name - the bluetooth name
 * @returns {BluetoothAgent}
 */
exports.getBluetooth = function getBluetooth(name) {
  if (!global_bt) {
    global_bt = new BluetoothAgent(name);
  }
  return global_bt;
};
