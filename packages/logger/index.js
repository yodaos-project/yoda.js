'use strict'

/**
 * @module logger
 * @description logger functionalities.
 *
 * It also supports transfering logs into another socket connection. It reads
 * the port number from the environment variable `LOG_PORT`, and send data
 * via tcp socket by the given port.
 *
 * For example,
 * ```shell
 * $ LOG_PORT=9000 iotjs test-logger-port.js
 * ```
 * The above command would starts a tcp server on the port 8000 for logs.
 */

var util = require('util')
var net = require('net')

/**
 * @constructor
 * @param {Number} port - the logger port
 */
function LoggingServer (port) {
  // only support single socket
  this._port = port
  this._socket = null
  if (typeof port === 'number') {
    this._server = net.createServer({
      allowHalfOpen: true
    }, (socket) => {
      if (this._socket) {
        socket.end('connection refused')
      } else {
        this._socket = socket
        socket.on('end', () => {
          this._socket = null
        })
      }
    })
  }
}

/**
 * send the message.
 * @param {String} msg - the message string
 */
LoggingServer.prototype.send = function (msg) {
  this._socket.send(msg)
}

/**
 * start the logger server.
 */
LoggingServer.prototype.start = function () {
  if (this._server) {
    this._server.listen(this._port)
  }
  return this
}

/**
 * check if the logging socket is available.
 */
LoggingServer.prototype.isAvailable = function () {
  return this._socket instanceof net.Socket
}

/**
 * close the logging server, only use for testing
 */
LoggingServer.prototype.destroy = function () {
  if (this._server) {
    this._server.close()
  }
  return this
}

// logger socket
function createLoggingServer (port) {
  var server = new LoggingServer(port)
  return server.start()
}

var loggingServer = createLoggingServer(process.env.LOG_PORT)

/**
 * @constructor
 * @param {String} name - the logger name
 */
function Logger (name) {
  if (!name) {
    name = 'default'
  }
  this.name = name
}

function createLoggerFunction (level) {
  if (typeof level !== 'string') {
    level = 'info'
  }
  return function () {
    var now = new Date()
    var line = `[${now.toISOString()}] ${level.toUpperCase()} <${this.name}> :: ` + util.format.apply(this, arguments)
    if (loggingServer.isAvailable()) {
      loggingServer.send(line)
    } else {
      // FIXME(Yorkie): check if the log is too long, just limit the maximum size is 1000.
      if (line.length >= 1000) {
        line = line.slice(0, 1000) + '...'
      }
      console[level](line)
    }
  }
}

/**
 * log level: debug
 */
Logger.prototype.debug = createLoggerFunction('debug')

/**
 * log level: log
 */
Logger.prototype.log = createLoggerFunction('info')

/**
 * log level: info
 */
Logger.prototype.info = createLoggerFunction('info')

/**
 * log level: warn
 */
Logger.prototype.warn = createLoggerFunction('warn')

/**
 * log level: error
 */
Logger.prototype.error = createLoggerFunction('error')

/**
 * close the logging server
 */
Logger.prototype.closeServer = function closeServer () {
  loggingServer.destroy()
}

/**
 * @example
 * var logger = require('logger')('some tag')
 * logger.log('test')
 * logger.error('something went wrong')
 *
 * @function defaults
 * @param {String} name - the log tag
 */
module.exports = function (name) {
  var logger = new Logger(name)
  // aliyun log?
  return logger
}
