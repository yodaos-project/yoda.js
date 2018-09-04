'use strict'

var native_ctor = require('./flora-cli.node')
var util = require('util')
var logger = require('logger')('flora')

function dummy_callback () {
}

function Client () {
  this.callbacks = new Array()
  this.callbacks[0] = dummy_callback
  this.callbacks[1] = dummy_callback
}

Client.prototype.on = function (name, cb) {
  if (name && util.isFunction(cb)) {
    if (name == 'recv_post') { this.callbacks[0] = cb } else if (name == 'disconnected') { this.callbacks[1] = cb }
  }
}

Client.prototype.native_callback = function (type, args) {
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
}

exports.MSGTYPE_INSTANT = 0
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

function Caps () {
  this.pairs = new Array()
}

Caps.INT32 = 105 // 'i'
Caps.INT64 = 108 // 'l'
Caps.FLOAT = 102 // 'f'
Caps.DOUBLE = 100 // 'd'
Caps.STRING = 83 // 'S'
Caps.BINARY = 66 // 'B'
Caps.OBJECT = 79 // 'O'

Caps.prototype.writeInt32 = function (i32) {
  if (!util.isNumber(i32)) { return }
  var p = { type: Caps.INT32, value: i32 }
  this.pairs.push(p)
}

Caps.prototype.writeInt64 = function (i64) {
  if (!util.isNumber(i64)) { return }
  var p = { type: Caps.INT64, value: i64 }
  this.pairs.push(p)
}

Caps.prototype.writeFloat = function (f) {
  if (!util.isNumber(f)) { return }
  var p = { type: Caps.FLOAT, value: f }
  this.pairs.push(p)
}

Caps.prototype.writeDouble = function (d) {
  if (!util.isNumber(d)) { return }
  var p = { type: Caps.DOUBLE, value: d }
  this.pairs.push(p)
}

Caps.prototype.write = function (v) {
  var p
  if (util.isString(v)) {
    p = { type: Caps.STRING, value: v }
  } else if (v instanceof Uint8Array) {
    p = { type: Caps.BINARY, value: v }
  } else if (v === null || v instanceof Caps) {
    p = { type: Caps.OBJECT, value: v }
  }
  this.pairs.push(p)
}

Caps.prototype.get = function (idx) {
  if (!util.isNumber(idx)) { return undefined }
  if (idx < 0 || idx >= this.pairs.length) { return undefined }
  return this.pairs[idx].value
}

exports.connect = function (uri, bufsize) {
  var cli = new Client()
  cli.__caps_ctor__ = Caps
  var r = native_ctor.connect(uri, bufsize, cli)
  if (r != this.CLI_SUCCESS) {
    logger.log('connect ' + uri + ' failed: ' + r)
    return undefined
  }
  return cli
}

exports.Caps = Caps
