'use strict'

/**
 * @module @yoda/flora
 * @description The `flora` module provide protocol of cross process communication.
 * exports 'connect' function for generate `flora client` instance.
 * exports 'Caps' constructor for generate `Caps` instance.
 * `Caps` is utility of data struct serialize.
 *
 * ```js
 * // create flora client instance
 * // connect to unix domain socket '/data/flora-service'
 * var flora_factory = require('@yoda/flora');
 * var client = flora_factory.connect('unix:/data/flora-service', 0);
 *
 * // subscribe msg
 * client.on("recv_post", function (name, msgtype, msg) {
 *   console.log("recv post msg " + name);
 * }
 * client.subscribe("test msg2", flora_factory.MSGTYPE_INSTANT);
 *
 * // post msg
 * var caps = new flora_factory.Caps();
 * caps.writeInt32(1);
 * caps.writeInt64(2);
 * caps.write("hello world");
 * var sub = new flora_factory.Caps();
 * sub.write("foo");
 * caps.write(sub);
 * client.post("test msg1", caps, flora_factory.MSGTYPE_INSTANT);
 *
 * // close client
 * client.close();
 * ```
 */

var nativeCtor = require('./flora-cli.node')
var logger = require('logger')('flora')

function dummyCallback () {
}

/**
 * @class
 */
function Client () {
  this.callbacks = []
  this.callbacks[0] = dummyCallback
  this.callbacks[1] = dummyCallback
}

/**
 * @callback FloraClientCallback
 * @param {String} name - msg name
 * @param {Number} type - msg type
 * @param {module:@yoda/flora~Caps} msg - msg content
 */

/**
 * setup callback functions
 * @memberof module:@yoda/flora~Client
 * @method on
 * @param {String} name - callback type ('recv_post' | 'disconnected')
 * @param {module:@yoda/flora~FloraClientCallback} cb - callback function
 */
Client.prototype.on = function (name, cb) {
  if (name && typeof cb === 'function') {
    if (name === 'recv_post') { this.callbacks[0] = cb } else if (name === 'disconnected') { this.callbacks[1] = cb }
  }
}

/**
 * Subscribe msg
 * @memberof module:@yoda/flora~Client
 * @method subscribe
 * @param {String} name - msg name to subscribe
 * @param {Number} type - msg type to subscribe (exports.MSGTYPE_INSTANT | exports.MSGTYPE_PERSIST)
 */
// Client.prototype.prototype.subscribe

/**
 * Unsubscribe msg
 * @memberof module:@yoda/flora~Client
 * @method unsubscribe
 * @param {String} name - msg name to unsubscribe
 * @param {Number} type - msg type to unsubscribe (exports.MSGTYPE_INSTANT | exports.MSGTYPE_PERSIST)
 */
// Client.prototype.prototype.unsubscribe

/**
 * Post msg
 * @memberof module:@yoda/flora~Client
 * @method post
 * @param {String} name - msg name to post
 * @param {module:@yoda/flora~Caps} msg - msg content
 * @param {Number} type - msg type to post (exports.MSGTYPE_INSTANT | exports.MSGTYPE_PERSIST)
 */
// Client.prototype.prototype.post

/**
 * close flora client
 * @memberof module:@yoda/flora~Client
 * @method close
 */
// Client.prototype.prototype.close

Client.prototype.native_callback = function (type, args) {
  /**
   * This function is called from native add-on, and ignoring any returns.
   * Put anything in next tick to handle possible js exceptions.
   */
  process.nextTick(() => {
    switch (type) {
      // recv post
      // params: name msgtype msgcontent
      case 0:
        this.callbacks[0](args[0], args[1], args[2])
        break
        // disconnected
      case 1:
        this.callbacks[1]()
        break
    }
  })
}

/**
 * @memberof module:@yoda/flora
 * @member {Number} MSGTYPE_INSTANT
 */
exports.MSGTYPE_INSTANT = 0
/**
 * @memberof module:@yoda/flora
 * @member {Number} MSGTYPE_PERSIST
 */
exports.MSGTYPE_PERSIST = 1
// exports.MSGTYPE_REQUEST = 2;

exports.CLI_SUCCESS = 0
// 认证失败
exports.CLI_EAUTH = -1
// 调用参数错误
exports.CLI_EINVAL = -2
// 连接断开
exports.CLI_ECONN = -3
// 'get'请求超时
// exports.CLI_ETIMEOUT = -4;
// 'get'请求目标不存在
// exports.CLI_ENEXISTS = -5;

/**
 * @class
 * @classdesc utility of data struct serialize
 */
function Caps () {
  this.pairs = []
}

Caps.INT32 = 105 // 'i'
Caps.INT64 = 108 // 'l'
Caps.FLOAT = 102 // 'f'
Caps.DOUBLE = 100 // 'd'
Caps.STRING = 83 // 'S'
Caps.BINARY = 66 // 'B'
Caps.OBJECT = 79 // 'O'

/**
 * write int32 value
 * @memberof module:@yoda/flora~Caps
 * @method writeInt32
 * @param {Number} i32 - int32 value
 */
Caps.prototype.writeInt32 = function (i32) {
  if (typeof i32 !== 'number') { return }
  var p = { type: Caps.INT32, value: i32 }
  this.pairs.push(p)
}

/**
 * write int64 value
 * @memberof module:@yoda/flora~Caps
 * @method writeInt64
 * @param {Number} i64 - int64 value
 */
Caps.prototype.writeInt64 = function (i64) {
  if (typeof i64 !== 'number') { return }
  var p = { type: Caps.INT64, value: i64 }
  this.pairs.push(p)
}

/**
 * write float value
 * @memberof module:@yoda/flora~Caps
 * @method writeFloat
 * @param {Number} f - float value
 */
Caps.prototype.writeFloat = function (f) {
  if (typeof f !== 'number') { return }
  var p = { type: Caps.FLOAT, value: f }
  this.pairs.push(p)
}

/**
 * write double value
 * @memberof module:@yoda/flora~Caps
 * @method writeDouble
 * @param {Number} d - double value
 */
Caps.prototype.writeDouble = function (d) {
  if (typeof d !== 'number') { return }
  var p = { type: Caps.DOUBLE, value: d }
  this.pairs.push(p)
}

/**
 * write string/Caps value
 * @memberof module:@yoda/flora~Caps
 * @method write
 * @param {Object} v - value to write (String | Caps instance)
 */
Caps.prototype.write = function (v) {
  var p
  if (typeof v === 'string') {
    p = { type: Caps.STRING, value: v }
  } else if (v instanceof Uint8Array) {
    p = { type: Caps.BINARY, value: v }
  } else if (v === null || v instanceof Caps) {
    p = { type: Caps.OBJECT, value: v }
  }
  this.pairs.push(p)
}

/**
 * get caps member value by index
 * @memberof module:@yoda/flora~Caps
 * @method get
 * @param {Number} idx - member index
 * @return member value
 */
Caps.prototype.get = function (idx) {
  if (typeof idx !== 'number') { return undefined }
  if (idx < 0 || idx >= this.pairs.length) { return undefined }
  return this.pairs[idx].value
}

/**
 * @memberof module:@yoda/flora
 * @method connect
 * @param {String} uri - flora service uri to connect
 * @param {Number} [bufsize=0] - preallocated msg buffer size
 * @return module:@yoda/flora~Client instance
 */
exports.connect = function (uri, bufsize) {
  var cli = new Client()
  cli.__caps_ctor__ = Caps
  var r = nativeCtor.connect(uri, bufsize, cli)
  if (r !== this.CLI_SUCCESS) {
    logger.log('connect ' + uri + ' failed: ' + r)
    return undefined
  }
  return cli
}

/**
 * @memberof module:@yoda/flora
 * @member {module:@yoda/flora~Caps} Caps - Caps constructor
 */
exports.Caps = Caps
