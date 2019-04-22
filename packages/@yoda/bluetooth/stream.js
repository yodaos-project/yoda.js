'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')
var helper = require('./helper')

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
  this._flora = new FloraComp('bluetooth-message-stream', {
    'uri': 'unix:/var/run/flora.sock',
    'bufsize': 40960,
    'reconnInterval': 10000
  })
  this._flora.handlers = {
    'bluetooth.ble.event': this._onevent.bind(this)
  }
  this._flora.init()
  this._end = false
}
inherits(BluetoothMessageStream, EventEmitter)

/**
 * @private
 */
BluetoothMessageStream.prototype._onevent = function (data) {
  try {
    if (this._end) {
      return
    }
    var msg = JSON.parse(data[0] + '')
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
      /*
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
}

/**
 * @private
 */
BluetoothMessageStream.prototype._send = function (cmdstr, props) {
  var data = Object.assign({ command: cmdstr }, props || {})
  var msg = [ JSON.stringify(data) ]

  if (cmdstr === 'ON') { /** support offline cache for ON command */
    return this._flora.post('bluetooth.ble.command', msg, floraFactory.MSGTYPE_PERSIST)
  } else {
    return this._flora.post('bluetooth.ble.command', msg, floraFactory.MSGTYPE_INSTANT)
  }
}

/**
 * start the message stream.
 * @param {string} name - the bluetooth name.
 * @param {boolean} subsequent - if true, always start until success.
 * @param {function} onerror
 * @returns {Null}
 */
BluetoothMessageStream.prototype.start = function start (name, cb) {
  this._end = false
  if (typeof cb === 'function') {
    this.once('opened', cb)
  }
  return this._send('ON', { name: name, unique: true })
}

/**
 * end the message stream.
 */
BluetoothMessageStream.prototype.end = function end () {
  this.once('closed', () => {
    this._end = true
  })
  return this._send('OFF')
}

/**
 * Disconnect the event socket, this is deprecated please use `.destroyConnection()`
 * instead.
 */
BluetoothMessageStream.prototype.disconnect = function disconnect () {
  return helper.disconnectAfterClose(this, 2000)
}

/**
 * Destroy the connection to bluetooth service, this firstly sends the OFF command
 * and destroy the connection.
 */
BluetoothMessageStream.prototype.destroyConnection = function destroyConnection () {
  return helper.disconnectAfterClose(this, 2000)
}

/**
 * write data to the message stream.
 * @param {Any} data - the data to write to peer device.
 */
BluetoothMessageStream.prototype.write = function write (data) {
  return this._send(undefined, { data: data })
}

exports.BluetoothMessageStream = BluetoothMessageStream
