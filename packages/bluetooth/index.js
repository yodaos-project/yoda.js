'use strict';

/**
 * @namespace bluetooth
 * @description The YodaOS includes support for the Bluetooth network
 * stack, which allows a device to wirelessly exchange data with other
 * Bluetooth devices. Using the Bluetooth APIs, your application can
 * perform the followings:
 *
 * - Scan for other devices.
 * - Control Bluetooth playback.
 * - Transfer data to and from other devices.
 */

var Bluetooth = require('./bluetooth.node').Bluetooth;
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var global_bt = null;

// a2dp events
var BT_EVENT_A2DP_OPEN = 1;
var BT_EVENT_A2DP_CLOSE = 2;
var BT_EVENT_A2DP_START = 3;
var BT_EVENT_A2DP_STOP  = 4;
var BT_EVENT_A2DP_RC_OPEN = 5;
var BT_EVENT_A2DP_RC_CLOSE = 6;
var BT_EVENT_A2DP_REMOTE_CMD = 7;
var BT_EVENT_A2DP_REMOTE_RSP = 8;

// avk events
var BT_EVENT_AVK_OPEN = 21;
var BT_EVENT_AVK_CLOSE = 22;
var BT_EVENT_AVK_STR_OPEN = 23;
var BT_EVENT_AVK_STR_CLOSE = 24;
var BT_EVENT_AVK_START = 25;
var BT_EVENT_AVK_PAUSE = 26;
var BT_EVENT_AVK_STOP = 28;
var BT_EVENT_AVK_RC_OPEN = 29;
var BT_EVENT_AVK_RC_PEER_OPEN = 30;
var BT_EVENT_AVK_RC_CLOSE = 31;
var BT_EVENT_AVK_SET_ABS_VOL = 32;
var BT_EVENT_AVK_GET_PLAY_STATUS = 33;

// ble events
var BT_EVENT_BLE_OPEN  = 41;
var BT_EVENT_BLE_CLOSE = 42;
var BT_EVENT_BLE_WRITE = 43;
var BT_EVENT_BLE_CON   = 44;

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
 * @param {String} [name=yoda] - the device name
 * @fires bluetooth.BluetoothAgent#ble open
 * @fires bluetooth.BluetoothAgent#ble close
 * @fires bluetooth.BluetoothAgent#ble data
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
 * @private
 */
BluetoothAgent.prototype.onevent = function(what, arg1, arg2, data) {
  if (what === BT_EVENT_A2DP_OPEN) {
    /**
     * a2dp open event
     * @event bluetooth.BluetoothAgent#a2dp open
     */
    this.emit('a2dp open');
  } else if (what === BT_EVENT_A2DP_CLOSE) {
    /**
     * a2dp close event
     * @event bluetooth.BluetoothAgent#a2dp close
     */
    this.emit('a2dp close');
  } else if (what === BT_EVENT_A2DP_START) {
    /**
     * a2dp start event
     * @event bluetooth.BluetoothAgent#a2dp start
     */
    this.emit('a2dp start');
  } else if (what === BT_EVENT_A2DP_STOP) {
    /**
     * a2dp stop event
     * @event bluetooth.BluetoothAgent#a2dp stop
     */
    this.emit('a2dp stop');
  } else if (what === BT_EVENT_AVK_OPEN) {
    /**
     * avk open event
     * @event bluetooth.BluetoothAgent#avk open
     */
    this.emit('avk open');
  } else if (what === BT_EVENT_A2DP_CLOSE) {
    /**
     * avk close event
     * @event bluetooth.BluetoothAgent#avk close
     */
     this.emit('avk close');
  } else if (what === BT_EVENT_AVK_START) {
    /**
     * avk close event
     * @event bluetooth.BluetoothAgent#avk close
     */
     this.emit('avk start');
  } else if (what === BT_EVENT_AVK_START) {
    /**
     * avk close event
     * @event bluetooth.BluetoothAgent#avk stop
     */
     this.emit('avk stop');
  } else if (what === BT_EVENT_BLE_OPEN) {
    /**
     * ble open event
     * @event bluetooth.BluetoothAgent#ble open
     */
    this.emit('ble open');
  } else if (what === BT_EVENT_BLE_CLOSE) {
    /**
     * ble close event
     * @event bluetooth.BluetoothAgent#ble close
     */
    this.emit('ble close');
  } else if (what === BT_EVENT_BLE_WRITE) {
    /**
     * ble data event
     * @event bluetooth.BluetoothAgent#ble data
     * @type {Object}
     * @property {Number} protocol - the procotol.
     * @property {String} data - the transfering data.
     * @property {bluetooth.BluetoothLowEnergyWritable} writable - the writable to write data.
     */
    this.emit('ble data', {
      protocol: arg1,
      data: data,
      writable: new BluetoothLowEnergyWritable(this, arg1),
    });
  } else {
    console.error(`unhandled event type ${what}`);
  }
};

/**
 * ondiscovery
 * @private
 */
BluetoothAgent.prototype.ondiscovery = function() {
  // TODO
};

/**
 * enable the given bluetooth module
 * @param {String} name - the bluetooth module name, like "ble", "a2dp".
 * @example
 * var bt = require('bluetooth').getBluetooth('mydevice');
 * bt.enable('ble');
 * bt.on('ble data', (message) => {
 *   console.log(message.protocol, message.data);
 * });
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
 * @returns {bluetooth.BluetoothPlayer}
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
 * @constructor
 * @memberof bluetooth
 * @param {bluetooth.BluetoothAgent} agent
 * @param {Number} uuid
 */
function BluetoothLowEnergyWritable(agent, uuid) {
  this._agent = agent;
  this._uuid = uuid;
}

/**
 * write the data to the specified ble uuid.
 * @param {Object|String} message - the data to write.
 */
BluetoothLowEnergyWritable.prototype.write = function(message) {
  if (typeof message !== 'string') {
    message = JSON.stringify(message);
  }
  return this._agent._handle.bleWrite(this._uuid, message);
};

/**
 * get the uuid.
 * @returns {Number} the uuid number.
 */
BluetoothLowEnergyWritable.prototype.getUuid = function() {
  return this._uuid;
};

/**
 * @memberof bluetooth
 * @method getBluetooth
 * @param {String} [name=yoda] - the device name
 * @returns {bluetooth.BluetoothAgent}
 */
exports.getBluetooth = function getBluetooth(name) {
  if (!global_bt) {
    global_bt = new BluetoothAgent(name);
  }
  return global_bt;
};
