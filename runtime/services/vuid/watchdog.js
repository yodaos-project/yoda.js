'use strict'

var fs = require('fs')
var property = require('property')
var logger = require('logger')('watchdog')

var WATCHDOG_NODE = '/dev/watchdog'
var WATCHDOG_DISABLE = property.get('watchdog.disable', 'persist')
var WATCHDOG_DEFAULT_TIMEOUT = 1000

var dog = null
var feeding = null

function noop () {
  // Nothing
}

function feed (dog) {
  fs.write(dog, Buffer.alloc(4), 0, 4, noop)
}

/**
 * Start feeding the watchdog.
 * @function startFeeding
 * @param {number} timeout
 * @param {function} callback
 */
function startFeeding (timeout, callback) {
  if (WATCHDOG_DISABLE) {
    logger.info('skip feeding watchdog because found watchdog.disable')
    return
  }
  if (typeof timeout === 'function') {
    callback = timeout
    timeout = WATCHDOG_DEFAULT_TIMEOUT
  } else if (typeof timeout !== 'number') {
    timeout = WATCHDOG_DEFAULT_TIMEOUT
  }
  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function.')
  }

  if (timeout <= 100) {
    callback(new Error('timeout must be bigger than 100.'))
  }
  if (feeding) {
    return callback(new Error('still feeding the dog.'))
  }

  // The dog(yorkie) is to watch the vui process.
  fs.open(WATCHDOG_NODE, 'w', function onopen (err, yorkie) {
    if (err) {
      return callback(err)
    }
    dog = yorkie
    feeding = setInterval(feed.bind(null, yorkie), timeout)
  })
}

/**
 * Stop the feeding.
 * @function stopFeeding
 * @param {function} callback
 */
function stopFeeding (callback) {
  clearInterval(feeding)
  fs.close(dog, callback)
}

exports.startFeeding = startFeeding
exports.stopFeeding = stopFeeding
