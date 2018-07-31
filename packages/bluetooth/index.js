'use strict';

/**
 * @namespace bluetooth
 */

var Bluetooth = require('./bluetooth.node').Bluetooth;
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var global_bt = null;

// events
var BT_EVENT_BLE_OPEN = 41;
var BT_EVENT_BLE_CLOSE = 42;
var BT_EVENT_BLE_WRITE = 43;

// sink commands
var A2DP_SINK_CMD = {
  play: 1,
  stop: 2,
  pause: 3,
  forward: 4,
  backward: 5,
};

/**
 * @memberof bluetooth
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
BluetoothAgent.prototype.onevent = function(what, arg1, arg2, data) {
  if (what === BT_EVENT_BLE_OPEN) {
    this.emit('ble open');
  } else if (what === BT_EVENT_BLE_CLOSE) {
    this.emit('ble close');
  } else if (what === BT_EVENT_BLE_WRITE) {
    this.emit('ble data', {
      protocol: arg1,
      data: data,
    });
  } else {
    console.error(`unhandled event type ${what}`);
  }
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
  } else if (name === 'a2dp') {
    this._handle.enableA2dp();
  } else if (name === 'a2dp sink') {
    this._handle.enableA2dp('sink');
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
  } else if (name === 'a2dp') {
    this._handle.disableA2dp();
  } else if (name === 'a2dp sink') {
    this._handle.disableA2dp('sink');
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
 * get the default player, only works when enable "a2dp sink"
 * @returns {BluetoothPlayer}
 */
BluetoothAgent.prototype.createPlayer = function() {
  return new BluetoothPlayer(this);
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
 * @constructor
 * @memberof bluetooth
 * @param {BluetoothAgent} agent
 */
function BluetoothPlayer(agent) {
  this._agent = agent;
  if (!(this._agent instanceof BluetoothAgent))
    throw new TypeError('agent must be an instance of BluetoothAgent');
}

/**
 * play the music
 */
BluetoothPlayer.prototype.play = function play() {
  return this._agent._handle.sendA2dpCmd(A2DP_SINK_CMD.play);
};

/**
 * pause the music
 */
BluetoothPlayer.prototype.pause = function pause() {
  return this._agent._handle.sendA2dpCmd(A2DP_SINK_CMD.pause);
};

/**
 * stop the music
 */
BluetoothPlayer.prototype.stop = function stop() {
  return this._agent._handle.sendA2dpCmd(A2DP_SINK_CMD.stop);
};

/**
 * play next
 */
BluetoothPlayer.prototype.forward = function forward() {
  return this._agent._handle.sendA2dpCmd(A2DP_SINK_CMD.forward);
};

/**
 * play previous
 */
BluetoothPlayer.prototype.backward = function backward() {
  return this._agent._handle.sendA2dpCmd(A2DP_SINK_CMD.backward);
};

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
