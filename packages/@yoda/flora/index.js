'use strict'

/**
 * @module @yoda/flora
 * @description The `flora` module provide protocol of cross process communication.
 * exports 'Agent' constructor for generate `Agent` instance.
 *
 * ```js
 * // create flora agent instance
 * var flora = require('@yoda/flora')
 * var agent = new flora.Agent('unix:/var/run/flora.sock#testAgent')
 *
 * // subscribe msg
 * agent.subscribe('test msg1', (msg, type) => {
 *   console.log('recv msg', msg)
 * })
 *
 * agent.declareMethod('test method1', (msg, reply) => {
 *   console.log('method call params', msg)
 *   reply.writeCode(0)
 *   reply.writeData([ 'hello', 'world' ])
 *   reply.end()
 * });
 *
 * // connect to unix domain socket '/var/run/flora.sock'
 * agent.start()
 *
 * // post msg
 * agent.post('test msg1', [ 1, 2, 'hello world', [ 'foo' ] ], flora.MSGTYPE_INSTANT)
 *
 * // remote call
 * agent.call('test method1', [ 'foo' ], 'testAgent', 200).then((reply) => {
 *   console.log('remote call return', msg)
 * }, (err) => {
 *   console.log('remote call failed:', err)
 * })
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
 * @param {object} options
 * @param {number} options.reconnInterval - reconnect interval time when flora disconnected. default value 10000
 * @param {number} options.bufsize - flora msg buf size. default value 32768
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
 * remove remote method
 * @method removeMethod
 * @memberof module:@yoda/flora~Agent
 * @param {string} name - method name
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
 * @member {any[]|module:@yoda/flora~Caps} msg
 */

/**
 * @memberof module:@yoda/flora~Response
 * @member {string} sender
 */

/**
 * @callback module:@yoda/flora~SubscribeMsgHandler
 * @param {any[]} - msg content
 * @param {number} - type of msg
 */

/**
 * @callback module:@yoda/flora~DeclareMethodHandler
 * @param {any[]} - msg content
 * @param {module:@yoda/flora~Reply} - an object that provide methods to reply data to caller
 */

/**
 * @class module:@yoda/flora~Reply
 * @classdesc an object that provide methods to reply data to remote method caller
 */

/**
 * set return code of remote method
 * @method writeCode
 * @memberof module:@yoda/flora~Reply
 * @param {number} code - return code
 */

/**
 * set return data of remote method
 * @method writeData
 * @memberof module:@yoda/flora~Reply
 * @param {any[]} data - reply data content
 */

/**
 * end Reply object, actually write return values to caller
 * @method end
 * @memberof module:@yoda/flora~Reply
 * @param {number} [code] - return code
 * @param {any[]} [data] - return data
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

function isCapsFormat (opts) {
  return typeof opts === 'object' && opts.format === 'caps'
}

/**
 * subscribe flora msg
 * @method subscribe
 * @memberof module:@yoda/flora~Agent
 * @param {string} name - msg name for subscribe
 * @param {module:@yoda/flora~SubscribeMsgHandler} handler - msg handler of received msg
 * @param {object} options
 * @param {string} options.format - specify format of received message. format string values: 'array' | 'caps'
 */
Agent.prototype.subscribe = function (name, handler, options) {
  this.nativeSubscribe(name, (msg, type) => {
    var cbmsg
    if (isCapsFormat(options)) {
      cbmsg = genCaps(msg)
    } else {
      cbmsg = this.nativeGenArray(msg)
    }
    try {
      handler(cbmsg, type)
    } catch (e) {
      process.nextTick(() => {
        throw e
      })
    }
  })
}
/**
 * declare remote method
 * @method declareMethod
 * @memberof module:@yoda/flora~Agent
 * @param {string} name - method name
 * @param {module:@yoda/flora~DeclareMethodHandler} handler - handler of remote method call
 * @param {object} options
 * @param {string} options.format - specify format of received method params. format string values: 'array' | 'caps'
 */
Agent.prototype.declareMethod = function (name, handler, options) {
  this.nativeDeclareMethod(name, (msg, reply) => {
    var cbmsg
    if (isCapsFormat(options)) {
      cbmsg = genCaps(msg)
    } else {
      cbmsg = this.nativeGenArray(msg)
    }
    try {
      return handler(cbmsg, reply)
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
 * @param {any[]|module:@yoda/caps~Caps} msg - msg content
 * @param {number} type - msg type:
 *                        module:@yoda/flora~MSGTYPE_INSTANT
 *                        module:@yoda/flora~MSGTYPE_PERSIST
 * @returns {number} 0 for success, otherwise error code
 */
Agent.prototype.post = function (name, msg, type) {
  if (typeof name !== 'string' || !isValidMsg(msg) || !isValidPostType(type)) {
    return exports.ERROR_INVALID_PARAM
  }
  return this.nativePost(name, msg, type, isCaps(msg))
}

/**
 * remote method call
 * @method call
 * @memberof module:@yoda/flora~Agent
 * @param {string} name - msg name
 * @param {any[]|module:@yoda/caps~Caps} [msg] - method params
 * @param {string} target - target client id of remote method
 * @param {number} [timeout] - remote call timeout
 * @param {object} [options]
 * @param {string} options.format - specify format of method params. format string values: 'array' | 'caps'
 * @returns {Promise} promise that resolves with {number} rescode, {module:@yoda/flora~Response}
 */
Agent.prototype.call = function (name, msg, target, timeout, options) {
  if (typeof name !== 'string' || !isValidMsg(msg) || typeof target !== 'string') {
    return Promise.reject(exports.ERROR_INVALID_PARAM)
  }
  return new Promise((resolve, reject) => {
    var r = this.nativeCall(name, msg, target, (rescode, reply) => {
      if (rescode === 0) {
        if (isCapsFormat(options)) {
          reply.msg = genCaps(reply.msg)
        } else {
          reply.msg = this.nativeGenArray(reply.msg)
        }
        resolve(reply)
      } else {
        reject(rescode)
      }
    }, isCaps(msg), timeout)
    if (r !== 0) {
      reject(r)
    }
  })
}

exports.Agent = Agent
exports.Caps = Caps

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
/**
 * @memberof module:@yoda/flora
 * @member {number} ERROR_TIMEOUT
 */
exports.ERROR_TIMEOUT = -4
/**
 * @memberof module:@yoda/flora
 * @member {number} ERROR_TARGET_NOT_EXISTS
 */
exports.ERROR_TARGET_NOT_EXISTS = -5
