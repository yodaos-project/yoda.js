'use strict'

/**
 * The ZeroMQ client library for JavaScript, which is compatible with:
 * [zeromq/zeromq.js](https://github.com/zeromq/zeromq.js).
 *
 * **Pub/Sub**
 *
 * This example demonstrates using `zeromq` in a classic Pub/Sub.
 *
 * ```js
 * // pubber.js
 * var zmq = require('zeromq')
 * var sock = zmq.socket('pub');
 *
 * sock.bindSync('ipc:///tmp/test');
 * console.log('Publisher bound to port 3000');
 *
 * setInterval(function(){
 *   console.log('sending a multipart message envelope');
 *   sock.send(['kitty cats', 'meow!']);
 * }, 500);
 *
 * // subber.js
 * var zmq = require('zeromq')
 * sock = zmq.socket('sub');
 *
 * sock.connect('tcp://127.0.0.1:3000');
 * sock.subscribe('kitty cats');
 * console.log('Subscriber connected to port 3000');
 *
 * sock.on('message', function(message) {
 *   console.log('containing message:', message);
 * });
 * ```
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
 * @param {String} uri - the uri to connect, support `ipc` and `tcp`.
 */
ZeroMQSocket.prototype.connect = function (uri) {
  return this._socket.connect(uri)
}

/**
 * bind the given uri
 * @param {String} uri - the uri to connect, support `ipc` and `tcp`.
 */
ZeroMQSocket.prototype.bindSync = function (uri) {
  return this._socket.bindSync(uri)
}

/**
 * subscribe the topics by filter, an empty string means "all"
 * @param {String} filter - the filter for topic, empty string means "all".
 */
ZeroMQSocket.prototype.subscribe = function (filter) {
  return this._socket.subscribe(filter)
}

/**
 * send buffers
 * @param {Buffer} bufs - the buffer or buffers to send.
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
 * @returns {module:zeromq~ZeroMQSocket}
 */
exports.socket = function createSocket (name) {
  return new ZeroMQSocket(name)
}
