'use strict'

/**
 * @module @yoda/flora
 */

/**
 * @class module:@yoda/flora~Agent
 * @classdesc agent of flora connection
 * @param {String} uri - uri of flora service
 * @param {Number} [reconnInterval=10000] - reconnect interval time when flora disconnected
 * @param {Number} [bufsize=32768] - flora msg buf size
 */

/**
 * start work
 * @method start
 * @memberof module:@yoda/flora~Agent
 */

/**
 * stop work
 * @method close
 * @memberof module:@yoda/flora~Agent
 */

/**
 * unsubscribe flora msg
 * @method unsubscribe
 * @memberof module:@yoda/flora~Agent
 * @param {String} name - msg name for unsubscribe
 */

/**
 * post msg
 * @method post
 * @memberof module:@yoda/flora~Agent
 * @param {String} name - msg name
 * @param {Array} msg - msg content
 * @param {Number} type - msg type (MSGTYPE_INSTANT | MSGTYPE_PERSIST}
 * @returns {Number} 0 for success, otherwise error code
 */

/**
 * @class module:@yoda/flora~Response
 * @classdesc Response of Agent.get returns
 */

/**
 * @memberof module:@yoda/flora~Response
 * @member {Number} retCode
 */

/**
 * @memberof module:@yoda/flora~Response
 * @member {Array} msg
 */

/**
 * @memberof module:@yoda/flora~Response
 * @member {String} sender
 */

/**
 * @callback module:@yoda/flora~SubscribeCallback
 * @param {Array} - msg content
 * @param {Number} - type of msg
 * @returns {module:@yoda/flora~Reply} reply message to sender of this REQUEST message
 */

var Agent = require('./flora-cli.node').Agent

/**
 * subscribe flora msg
 * @method subscribe
 * @memberof module:@yoda/flora~Agent
 * @param {String} name - msg name for subscribe
 * @param {module:@yoda/flora~SubscribeCallback} cb - callback if received msg that subscribed
 */
Agent.prototype.subscribe = function (name, cb) {
  this.nativeSubscribe(name, (msg, type) => {
    try {
      return cb(msg, type)
    } catch (e) {
      process.nextTick(() => {
        throw e
      })
    }
  })
}

/**
 * post msg and get response
 * @method get
 * @memberof module:@yoda/flora~Agent
 * @param {String} name - msg name
 * @param {Array} [msg] - msg content
 * @returns {Promise} promise that resolves with an array of {module:@yoda/flora~Response}
 */
Agent.prototype.get = function (name, msg) {
  if (typeof name !== 'string') {
    return Promise.reject(exports.ERROR_INVALID_PARAM)
  }
  if (msg !== undefined && msg !== null && !Array.isArray(msg)) {
    return Promise.reject(exports.ERROR_INVALID_PARAM)
  }
  var ret = new Promise((resolve, reject) => {
    var r = this.nativeGet(name, msg, (responses) => {
      resolve(responses)
    })
    if (r !== 0) {
      reject(r)
    }
  })
  return ret
}

exports.Agent = Agent

/**
 * @class module:@yoda/flora~Reply
 * @classdesc reply message for REQUEST
 * @param {Number} code - return code
 * @param {Array} msg - reply message content
 */
function Reply (code, msg) {
  this.retCode = code
  this.msg = msg
}

exports.Reply = Reply

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
/**
 * @memberof module:@yoda/flora
 * @member {Number} MSGTYPE_REQUEST
 */
exports.MSGTYPE_REQUEST = 2
/**
 * @memberof module:@yoda/flora
 * @member {Number} ERROR_INVALID_URI
 */
exports.ERROR_INVALID_URI = -1
/**
 * @memberof module:@yoda/flora
 * @member {Number} ERROR_INVALID_PARAM
 */
exports.ERROR_INVALID_PARAM = -2
/**
 * @memberof module:@yoda/flora
 * @member {Number} ERROR_NOT_CONNECTED
 */
exports.ERROR_NOT_CONNECTED = -3
