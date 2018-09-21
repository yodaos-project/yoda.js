'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var helper = require('./helper')
var blePath = `ipc://${helper.CHANNEL_PREFIX}/rokid_ble_event`

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
  this._end = false
  this._cmdSocket = helper.getCmdSocket()
  this._eventSocket = helper.getSocket(blePath)
  this._eventSocket.on('message', (buffer) => {
    try {
      if (this._end) {
        return
      }
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
BluetoothMessageStream.prototype._send = function (cmdstr, name) {
  return this._cmdSocket.send(JSON.stringify({
    proto: 'ROKID_BLE',
    command: cmdstr,
    name: name
  }))
}

/**
 * start the message stream.
 * @param {string} name - the bluetooth name.
 * @param {boolean} always - if true, always start until success.
 * @param {function} onerror
 * @returns {Null}
 */
BluetoothMessageStream.prototype.start = function start (name, always, onerror) {
  if (always) {
    var count = 0
    var timer = setInterval(() => {
      if (count >= 20) {
        clearInterval(timer)
        // throw the connect error.
        var err = new Error('bluetooth connect failed')
        if (typeof onerror === 'function') {
          onerror(err)
        } else {
          throw err
        }
      } else {
        count += 1
        this.start(name)
      }
    })
    this.once('opened', () => clearInterval(timer))
    this.start(name)
  } else {
    this._end = false
    this._send('ON', name)
  }
}

/**
 * end the message stream.
 */
BluetoothMessageStream.prototype.end = function end () {
  this._end = true
  return this._send('OFF')
}

/**
 * disconnect the event socket
 */
BluetoothMessageStream.prototype.disconnect = function disconnect () {
  this.end()
  this.removeAllListeners()
  process.nextTick(() => {
    this._eventSocket.close()
  })
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
