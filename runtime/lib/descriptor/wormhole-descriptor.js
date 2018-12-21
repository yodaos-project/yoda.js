'use strict'
/**
 * @namespace yodaRT.activity
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = WormholeDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class WormholeClient
 * @hideconstructor
 * @extends EventEmitter
 */
function WormholeDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(WormholeDescriptor, EventEmitter)
WormholeDescriptor.prototype.toJSON = function toJSON () {
  return WormholeDescriptor.prototype
}

Object.assign(WormholeDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * Send message to Rokid App.
     * @memberof yodaRT.activity.Activity.WormholeClient
     * @instance
     * @function sendToApp
     * @param {string} topic -
     * @param {any} data -
     * @returns {Promise<void>}
     */
    sendToApp: {
      type: 'method',
      returns: 'promise',
      fn: function sendToApp (topic, data) {
        return this._runtime.wormhole.sendToApp(topic, data)
      }
    },
    updateVolume: {
      type: 'method',
      returns: 'promise',
      fn: function updateVolume () {
        this._runtime.wormhole.updateVolume()
        return Promise.resolve()
      }
    }
  }
)
