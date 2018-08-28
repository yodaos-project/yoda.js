'use strict'

/**
 * The ZeroMQ client library for JavaScript.
 * @module zeromq
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var ZmqSocket = require('./zeromq.node').ZmqSocket
var SocketTypes = {
  'pair': 0,
  'pub': 1,
  'sub': 2,
  'req': 3,
  'rep': 4,
  'dealer': 5,
  'router': 6,
  'pull': 7,
  'push': 8,
  'xpub': 9,
  'xsub': 10,
  'stream': 11
}

/**
 * @constructor
 * @param {String} name - the socket type name, available is "pub",
 *                        "sub", "req", "req" and etc..
 * @throws {Error} invalid socket type.
 * augments {EventEmitter}
 */
function ZeroMQSocket (name) {
  EventEmitter.call(this)
  var type = SocketTypes[name]
  if (type < 0 || type > SocketTypes.stream) {
    throw new TypeError('invalid socket type')
  }

  this._type = type
  this._socket = new ZmqSocket(type)
  this._socket.onerror = this._onerror.bind(this)
  this._socket.onread = this._onread.bind(this)
}
inherits(ZeroMQSocket, EventEmitter)

/**
 * connect to the given uri
 */
ZeroMQSocket.prototype.connect = function (uri) {
  return this._socket.connect(uri)
}

/**
 * bind the given uri
 */
ZeroMQSocket.prototype.bindSync = function (uri) {
  return this._socket.bindSync(uri)
}

/**
 * subscribe the topics by filter, an empty string means "all"
 */
ZeroMQSocket.prototype.subscribe = function (filter) {
  return this._socket.subscribe(filter)
}

/**
 * send buffers
 */
ZeroMQSocket.prototype.send = function (bufs) {
  if (Array.isArray(bufs)) {
    return bufs.forEach((buf) => this.send(buf))
  }
  if (!Buffer.isBuffer(bufs)) {
    return this._socket.send(Buffer.from(bufs + ''))
  } else {
    return this._socket.send(bufs)
  }
}

/**
 * handle error
 * @private
 */
ZeroMQSocket.prototype._onerror = function handleError (err) {
  /**
   * @event ZeroMQSocket#error
   * @type {Error}
   */
  this.emit('error', err)
}

/**
 * handle read
 * @private
 */
ZeroMQSocket.prototype._onread = function () {
  while (true) {
    var msg = this._socket.recv()
    if (msg) {
      /**
       * @event ZeroMQSocket#message
       * @type {Buffer} msg
       */
      this.emit('message', msg)
    } else {
      break
    }
  }
}

/**
 * @function socket
 * @param {String} name
 * @returns {ZeroMQSocket}
 */
exports.socket = function createSocket (name) {
  return new ZeroMQSocket(name)
}
