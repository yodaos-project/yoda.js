'use strict'

/**
 * @module @yoda/flora
 * @description The `flora` module provide protocol of cross process communication.
 * exports 'Agent' constructor for generate `Agent` instance.
 *
 * ```js
 * // create flora agent instance
 * var flora = require('@yoda/flora')
 * var agent = new flora.Agent('unix:/var/run/flora.sock')
 *
 * // subscribe msg
 * agent.subscribe('test msg1', (msg, type) => {
 *   console.log('recv msg', msg)
 * })
 *
 * // connect to unix domain socket '/var/run/flora.sock'
 * agent.start()
 *
 * // post msg
 * agent.post('test msg1', [ 1, 2, 'hello world', [ 'foo' ] ], flora.MSGTYPE_INSTANT)
 *
 * // close agent
 * // close agent after 1 second, for wait agent receive 'test msg1'
 * setTimeout(() => {
 *   agent.close()
 * }, 1000)
 * ```
 */

/**
 * @class module:@yoda/flora~Agent
 * @classdesc agent of flora connection
 * @param {string} uri - uri of flora service
 * @param {number} [reconnInterval=10000] - reconnect interval time when flora disconnected
 * @param {number} [bufsize=32768] - flora msg buf size
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
 * @param {string} name - msg name for unsubscribe
 */

/**
 * @class module:@yoda/flora~Response
 * @classdesc Response of Agent.get returns
 */

/**
 * @memberof module:@yoda/flora~Response
 * @member {number} retCode
 */

/**
 * @memberof module:@yoda/flora~Response
 * @member {any[]} msg
 */

/**
 * @memberof module:@yoda/flora~Response
 * @member {string} sender
 */

/**
 * @callback module:@yoda/flora~SubscribeMsgHandler
 * @param {any[]} - msg content
 * @param {number} - type of msg
 * @returns {module:@yoda/flora~Reply} reply message to sender of this REQUEST message
 */

var Agent = require('./flora-cli.node').Agent
var Caps
try {
  Caps = require('@yoda/caps/caps.node').Caps
} catch (e) {
  Caps = undefined
}

function genCaps (hackedCaps) {
  if (typeof Caps !== 'function') {
    return undefined
  }
  return new Caps(hackedCaps)
}

/**
 * subscribe flora msg
 * @method subscribe
 * @memberof module:@yoda/flora~Agent
 * @param {string} name - msg name for subscribe
 * @param {module:@yoda/flora~SubscribeMsgHandler} handler - msg handler of received msg
 * @param {boolean} recvCaps - if true, received message is Caps instance, otherwise message is an Array
 */
Agent.prototype.subscribe = function (name, handler, recvCaps) {
  this.nativeSubscribe(name, (msg, type) => {
    var cbmsg
    if (recvCaps) {
      cbmsg = genCaps(msg)
    } else {
      cbmsg = this.nativeGenArray(msg)
    }
    try {
      return handler(cbmsg, type)
    } catch (e) {
      process.nextTick(() => {
        throw e
      })
    }
  })
}

function isCaps (msg) {
  return typeof Caps === 'function' && (msg instanceof Caps)
}

function isValidMsg (msg) {
  if (msg === undefined || msg === null) {
    return true
  }
  if (Array.isArray(msg)) {
    return true
  }
  return isCaps(msg)
}

function isValidPostType (type) {
  if (type === undefined) {
    return true
  }
  if (typeof type !== 'number') {
    return false
  }
  return type >= exports.MSGTYPE_INSTANT && type <= exports.MSGTYPE_PERSIST
}

/**
 * post msg
 * @method post
 * @memberof module:@yoda/flora~Agent
 * @param {string} name - msg name
 * @param {any[]} msg - msg content
 * @param {number} type - msg type (MSGTYPE_INSTANT | MSGTYPE_PERSIST}
 * @returns {number} 0 for success, otherwise error code
 */
Agent.prototype.post = function (name, msg, type) {
  if (typeof name !== 'string' || !isValidMsg(msg) || !isValidPostType(type)) {
    return exports.ERROR_INVALID_PARAM
  }
  return this.nativePost(name, msg, type, isCaps(msg))
}

/**
 * post msg and get response
 * @method get
 * @memberof module:@yoda/flora~Agent
 * @param {string} name - msg name
 * @param {any[]} [msg] - msg content
 * @returns {Promise} promise that resolves with an array of {module:@yoda/flora~Response}
 */
Agent.prototype.get = function (name, msg) {
  if (typeof name !== 'string' || !isValidMsg(msg)) {
    return Promise.reject(exports.ERROR_INVALID_PARAM)
  }
  return new Promise((resolve, reject) => {
    var isCapsMsg = isCaps(msg)
    var r = this.nativeGet(name, msg, (replys) => {
      if (Array.isArray(replys)) {
        var i
        for (i = 0; i < replys.length; ++i) {
          if (isCapsMsg) {
            replys[i].msg = genCaps(replys[i].msg)
          } else {
            replys[i].msg = this.nativeGenArray(replys[i].msg)
          }
        }
      }
      resolve(replys)
    })
    if (r !== 0) {
      reject(r)
    }
  })
}

exports.Agent = Agent

/**
 * @class module:@yoda/flora~Reply
 * @classdesc reply message for REQUEST
 * @param {number} code - return code
 * @param {any[]} msg - reply message content
 */
function Reply (code, msg) {
  this.retCode = code
  this.msg = msg
}

exports.Reply = Reply

/**
 * @memberof module:@yoda/flora
 * @member {number} MSGTYPE_INSTANT
 */
exports.MSGTYPE_INSTANT = 0
/**
 * @memberof module:@yoda/flora
 * @member {number} MSGTYPE_PERSIST
 */
exports.MSGTYPE_PERSIST = 1
/**
 * @memberof module:@yoda/flora
 * @member {number} MSGTYPE_REQUEST
 */
exports.MSGTYPE_REQUEST = 2
/**
 * @memberof module:@yoda/flora
 * @member {number} ERROR_INVALID_URI
 */
exports.ERROR_INVALID_URI = -1
/**
 * @memberof module:@yoda/flora
 * @member {number} ERROR_INVALID_PARAM
 */
exports.ERROR_INVALID_PARAM = -2
/**
 * @memberof module:@yoda/flora
 * @member {number} ERROR_NOT_CONNECTED
 */
exports.ERROR_NOT_CONNECTED = -3
