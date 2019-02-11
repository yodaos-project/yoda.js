'use strict'
var util = require('util')

/**
 * @module logger
 * @description logger functionalities.
 *
 * The above command would starts a tcp server on the port 8000 for logs.
 */
var native
if (process.platform === 'darwin' || process.env.NODE_ENV === 'unittest') {
  console.log('/** using stdout as @yoda/logger output target. */')
  var consoleLevels = [
    () => {}, /** none */
    console.debug, /** verbose */
    console.debug, /** debug */
    console.info, /** info */
    console.warn, /** warn */
    console.error /** error */
  ]
  native = {
    enableCloud: function () {},
    print: function native (lvl, tag, line) {
      var fn = consoleLevels[lvl]
      var level = Object.keys(logLevels)[lvl - 1]
      fn(`${new Date().toISOString()} [${level.toUpperCase()}] <${tag}>`, line)
    }
  }
} else {
  native = require('./logger.node')
}

var logLevels = {
  'none': 0,
  'verbose': 1,
  'debug': 2,
  'info': 3,
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
    level = 3 // info
  }
  return function printlog () {
    var line = ''
    if (arguments.length === 1) {
      line = util.formatValue(arguments[0])
    } else if (arguments.length === 2) {
      line = `${util.formatValue(arguments[0])} ${util.formatValue(arguments[1])}`
    } else {
      line = util.format.apply(util, arguments)
    }
    if (line.length >= 1024) {
      line = line.slice(0, 1024) + '...'
    }
    native.print(level, this.name, line)
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

/**
 * set upload level to cloud
 *
 * @example
 * var setGlobalUploadLevel = require('logger').setGlobalUploadLevel
 * // enable
 * setGlobalUploadLevel(level, "your gw authorization")
 * // disable
 * setGlobalUploadLevel(logLevels.none)
 *
 * @function defaults
 * @param {number} level - set logLevels.none to disable;
 *                         set level between
 *                         [verbose, error] to enable
 * @param {string} authorization - cloudgw authorization
 * @throws {error} level out of range or missing authorization
 */
module.exports.setGlobalUploadLevel = function (level, authorization) {
  if (level === logLevels.none) {
    native.enableCloud(logLevels.none, '')
  } else if (logLevels.verbose <= level && level <= logLevels.error) {
    if (!authorization) {
      throw new Error('missing cloudgw authorization')
    }
    native.enableCloud(level, authorization)
  } else {
    throw new Error(
      `upload level should between [${logLevels.verbose},${logLevels.error}]`
    )
  }
}

module.exports.levels = logLevels
