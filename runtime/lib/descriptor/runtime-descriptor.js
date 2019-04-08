'use strict'
/**
 * @namespace yodaRT.activity
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = YodaDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class RuntimeClient
 * @hideconstructor
 * @extends EventEmitter
 */
function RuntimeDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(RuntimeDescriptor, EventEmitter)
RuntimeDescriptor.prototype.toJSON = function toJSON () {
  return RuntimeDescriptor.prototype
}

Object.assign(RuntimeDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * Sets the runtime mode: `setup`, `ready`:
     * - *setup* is to call setup app
     * - *ready* should be triggered by an app, that tells runtime it’s available.
     *
     * @memberof yodaRT.activity.Activity.RuntimeClient
     * @instance
     * @function setMode
     * @param {string} mode - the runtime mode, alternatives: `setup` and `ready`.
     * @returns {Promise<void>}
     */
    setMode: {
      type: 'method',
      returns: 'promise',
      fn: function setMode (mode) {
        // TODO
      }
    },
    /**
     * Lets the runtime enter idle state.
     *
     * @memberof yodaRT.activity.Activity.RuntimeClient
     * @instance
     * @function idle
     * @returns {Promise<void>}
     */
    idle: {
      type: 'method',
      returns: 'promise',
      fn: function idle () {
        return this._runtime.idle()
      }
    }
  }
)
