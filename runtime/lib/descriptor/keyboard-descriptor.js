'use strict'
/**
 * @namespace yodaRT.activity
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = KeyboardDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class KeyboardClient
 * @hideconstructor
 * @extends EventEmitter
 */
function KeyboardDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(KeyboardDescriptor, EventEmitter)
KeyboardDescriptor.prototype.toJSON = function toJSON () {
  return KeyboardDescriptor.prototype
}

Object.assign(KeyboardDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * @event yodaRT.activity.Activity.KeyboardClient#click
     * @param {object} event -
     * @param {number} event.keyCode -
     */
    click: {
      type: 'event'
    },
    /**
     * @event yodaRT.activity.Activity.KeyboardClient#dbclick
     * @param {object} event -
     * @param {number} event.keyCode -
     */
    dbclick: {
      type: 'event'
    },
    /**
     * @event yodaRT.activity.Activity.KeyboardClient#longpress
     * @param {object} event -
     * @param {number} event.keyCode -
     */
    longpress: {
      type: 'event'
    }
  },
  {
    /**
     * Intercepts all events for key code until restores default behavior by KeyboardClient.restoreDefaults
     *
     * @memberof yodaRT.activity.Activity.KeyboardClient
     * @instance
     * @function preventDefaults
     * @param {number} keyCode -
     * @returns {Promise<void>}
     */
    preventDefaults: {
      type: 'method',
      returns: 'promise',
      fn: function preventDefaults (keyCode, event) {
        if (typeof keyCode !== 'number') {
          return Promise.reject(new Error('Expect a number on first argument of keyboard.preventDefaults.'))
        }
        if (event != null && typeof event !== 'string') {
          return Promise.reject(new Error('Expect a string on second argument of keyboard.preventDefaults.'))
        }
        return this._runtime.keyboard.preventKeyDefaults(this._appId, keyCode, event)
      }
    },
    /**
     * Restore default behavior of key code.
     *
     * @memberof yodaRT.activity.Activity.KeyboardClient
     * @instance
     * @function restoreDefaults
     * @param {number} keyCode -
     * @returns {Promise<void>}
     */
    restoreDefaults: {
      type: 'method',
      returns: 'promise',
      fn: function restoreDefaults (keyCode, event) {
        if (typeof keyCode !== 'number') {
          return Promise.reject(new Error('Expect a string on first argument of keyboard.restoreDefaults.'))
        }
        if (event != null && typeof event !== 'string') {
          return Promise.reject(new Error('Expect a string on second argument of keyboard.restoreDefaults.'))
        }
        return this._runtime.keyboard.restoreKeyDefaults(this._appId, keyCode, event)
      }
    }
  })
