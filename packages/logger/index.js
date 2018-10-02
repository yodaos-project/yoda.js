'use strict'

/**
 * @module logger
 * @description logger functionalities.
 *
 * The above command would starts a tcp server on the port 8000 for logs.
 */

var util = require('util')
var native = require('./logger.node')

var logLevels = {
  'verbose': 1,
  'info': 2,
  'debug': 3,
  'warn': 4,
  'error': 5
}

/**
 * @constructor
 * @param {String} name - the logger name
 */
function Logger (name) {
  this.name = name || 'default'
}

function createLoggerFunction (level) {
  level = logLevels[level]
  if (!level || level < 1 || level > 5) {
    level = 2 // info
  }
  return function printlog () {
    var now = new Date()
    var line = `[${now.toISOString()}] :: ` + util.format.apply(this, arguments)
    if (line.length >= 1000) {
      line = line.slice(0, 1000) + '...'
    }
    console.log(line)
    // FIXME(Yorkie): uncomment when the NAPI thread-safe bug is fixed.
    // native.print(level, this.name, line)
  }
}

/**
 * log level: verbose
 */
Logger.prototype.verbose = createLoggerFunction('verbose')

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

// disable cloud by default
native.enableCloud(0)

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
  return new Logger(name)
}
