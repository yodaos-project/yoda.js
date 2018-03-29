'use strict';

const property = require('@rokid/property');
const logger = require('@rokid/logger')('bluetooth');
const context = require('@rokid/context');
const BluetoothWrap = require('bindings')('bluetooth').BluetoothWrap;
const EventEmitter = require('events').EventEmitter;

const id = property.serialno ? property.serialno.slice(-6) : 'xxxxxx';
const name = context.deviceConfig.namePrefix + id;
let handle;

const BT_EVENTS = {
  // a2dp source events
  A2DP_SOURCE_OPEN: 1,
  A2DP_SOURCE_CLOSE: 2,
  A2DP_SOURCE_START: 3,
  A2DP_SOURCE_STOP: 4,
  // a2dp sink events
  A2DP_SINK_OPEN: 21,
  A2DP_SINK_CLOSE: 22,
  A2DP_SINK_STREAM_OPEN: 23,
  A2DP_SINK_STREAM_CLOSE: 24,
  A2DP_SINK_CHANNEL_START: 25,
  A2DP_SINK_CHANNEL_PAUSE: 26,
  A2DP_SINK_CHANNEL_STOP: 27,
  A2DP_SINK_RC_OPEN: 28,
  A2DP_SINK_RC_PEER_OPEN: 29,
  A2DP_SINK_RC_CLOSE: 30,
  BT_EVENT_AVK_SET_ABS_VOL: 31,
  // ble
  BLE_OPEN: 41,
  BLE_CLOSE: 42,
  BLE_WRITE: 43,
};

let sinkConnected = false;
let bluetooth = module.exports = new EventEmitter();
reinit();

function reinit() {
  if (handle) {
    handle.destroy();
  }
  handle = new BluetoothWrap(name);
  handle.onevent = onevent;
  handle.ondiscovery = ondiscovery;
  handle.setVisibility(true);
}

function onevent(event, arg1, arg2, data) {
  switch (event) {
    case BT_EVENTS.A2DP_SOURCE_OPEN:
      bluetooth.emit('a2dp source open', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SOURCE_CLOSE:
      bluetooth.emit('a2dp source close', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SOURCE_START:
      bluetooth.emit('a2dp source start', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SOURCE_STOP:
      bluetooth.emit('a2dp source stop', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SINK_OPEN:
      bluetooth.emit('a2dp sink open', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SINK_CLOSE:
      bluetooth.emit('a2dp sink close', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SINK_STREAM_OPEN:
      bluetooth.emit('a2dp sink stream open', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SINK_STREAM_CLOSE:
      bluetooth.emit('a2dp sink stream close', arg1, arg2, data);
      break;
    case BT_EVENTS.BT_EVENT_AVK_SET_ABS_VOL:
      bluetooth.emit('a2dp set volume', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SINK_CHANNEL_START:
      bluetooth.emit('a2dp sink channel start', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SINK_CHANNEL_PAUSE:
      bluetooth.emit('a2dp sink channel pause', arg1, arg2, data);
      break;
    case BT_EVENTS.A2DP_SINK_CHANNEL_STOP:
      bluetooth.emit('a2dp sink channel stop', arg1, arg2, data);
      break;
    case BT_EVENTS.BLE_OPEN:
      bluetooth.emit('ble open', arg1, arg2, data);
      break;
    case BT_EVENTS.BLE_CLOSE:
      bluetooth.emit('ble close', arg1, arg2, data);
      break;
    case BT_EVENTS.BLE_WRITE:
      bluetooth.emit('ble data', arg1, arg2, data);
      break;
  }
};

function ondiscovery(name, completed) {
  if (completed) {
    bluetooth.emit('discovery finished');
  } else {
    bluetooth.emit('discovery device', name);
  }
};

bluetooth.connect = function(type) {
  switch (type.toLowerCase()) {
    case 'ble':
      handle.enableBle();
      break;
    case 'a2dp_sink':
      handle.enableA2dpSink();
      sinkConnected = true;
      break;
    default:
      throw new Error('unhandled error type ' + type);
  }
};

bluetooth.disconnect = function(type) {
  switch (type.toLowerCase()) {
    case 'ble':
      handle.disableBle();
      // TODO(Yorkie) ble can not be reuse.
      reinit();
      break;
    case 'a2dp_sink':
      handle.disableA2dpSink();
      sinkConnected = false;
      break;
    default:
      throw new Error('unhandled error type ' + type)
  }
};

bluetooth.send = function(command) {
  if (!sinkConnected)
    throw new Error('connect A2DP_SINK required before sending command');
  if (command === 'play') {
    handle.a2dpSinkSendPlay();
  } else if (command === 'pause') {
    handle.a2dpSinkSendPause();
  } else if (command === 'stop') {
    handle.a2dpSinkSendStop();
  } else if (command === 'forward') {
    handle.a2dpSinkSendForward();
  } else if (command === 'backward') {
    handle.a2dpSinkSendBackward();
  } else {
    throw new Error('invalid command ' + command);
  }
};
