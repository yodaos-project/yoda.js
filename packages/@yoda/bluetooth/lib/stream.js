'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var helper = require('./helper')
var blePath = 'ipc:///var/run/bluetooth/rokid_ble_event'

/**
 * Use `bluetooth.getMessageStream()` instead of this constructor.
 * @class
 * @classdesc This class is used to send/receive messages from Bluetooth device.
 * @augments EventEmitter
 * @memberof module:@yoda/bluetooth
 * @example
 * var messageStream = bluetooth.getMessageStream()
 * messageStream.start()
 * messageStream.on('data', (data) => {
 *   console.log(data)
 * })
 * messageStream.on('connected', (data) => {
 *   console.log(data)
 * })
 * messageStream.write('something')
 * messageStream.write({ foobar: true })
 */
function BluetoothMessageStream () {
  EventEmitter.call(this)
  this._cmdSocket = helper.getCmdSocket()
  this._eventSocket = helper.getSocket(blePath)
  this._eventSocket.on('message', (buffer) => {
    try {
      var msg = JSON.parse(buffer + '')
      if (msg.state) {
        /**
         * when channel is opened
         * @event module:@yoda/bluetooth.BluetoothMessageStream#opened
         * @type {Object}
         */
        /**
         * when channel is closed
         * @event module:@yoda/bluetooth.BluetoothMessageStream#closed
         * @type {Object}
         */
        /**
         * when device is connected
         * @event module:@yoda/bluetooth.BluetoothMessageStream#connected
         * @type {Object}
         */
        /**
         * when device is disconnected
         * @event module:@yoda/bluetooth.BluetoothMessageStream#disconnected
         * @type {Object}
         */
        /**
         * data is handshaking
         * @event module:@yoda/bluetooth.BluetoothMessageStream#handshake
         * @type {Object}
         */
        this.emit(msg.state)
      } else {
        /**
         * when some data is sent.
         * @event module:@yoda/bluetooth.BluetoothMessageStream#data
         * @type {Object}
         */
        this.emit('data', msg && msg.data)
      }
    } catch (err) {
      /**
       * when something is wrong.
       * @event module:@yoda/bluetooth.BluetoothMessageStream#error
       * @type {Error}
       */
      this.emit('error', err)
    }
  })
}
inherits(BluetoothMessageStream, EventEmitter)

/**
 * @private
 */
BluetoothMessageStream.prototype._send = function (cmdstr) {
  return this._cmdSocket.send(JSON.stringify({
    proto: 'ROKID_BLE',
    command: cmdstr
  }))
}

/**
 * start the message stream.
 */
BluetoothMessageStream.prototype.start = function start () {
  return this._send('ON')
}

/**
 * end the message stream.
 */
BluetoothMessageStream.prototype.end = function end () {
  // TODO(Yorkie): should end socket connection.
  this._eventSocket.removeAllListeners()
  return this._send('OFF')
}

/**
 * write data to the message stream.
 * @param {Any} data - the data to write to peer device.
 */
BluetoothMessageStream.prototype.write = function write (data) {
  return this._cmdSocket.send(JSON.stringify({
    proto: 'ROKID_BLE',
    data: data
  }))
}

exports.BluetoothMessageStream = BluetoothMessageStream
