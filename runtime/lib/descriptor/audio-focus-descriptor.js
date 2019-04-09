'use strict'
/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

var yodaPath = require('@yoda/util').path
var LIGHT_SOURCE = '/opt/light'

module.exports = AudioFocusDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class AudioFocusClient
 * @hideconstructor
 * @extends EventEmitter
 */
function AudioFocusDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(AudioFocusDescriptor, EventEmitter)
AudioFocusDescriptor.prototype.toJSON = function toJSON () {
  return AudioFocusDescriptor.prototype
}

Object.assign(AudioFocusDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * Used to indicate a gain of audio focus, or a request of audio focus.
     *
     * @event yodaRT.activity.Activity.AudioFocusClient#gain
     * @param {string} id - the request id.
     */
    gain: {
      type: 'event'
    },
    /**
     * Used to indicate a loss of audio focus.
     *
     * @event yodaRT.activity.Activity.AudioFocusClient#loss
     * @param {string} id - the request id.
     * @param {boolean} transient - if this loss is transient.
     * @param {boolean} canDuck - if this loss is able to duck.
     */
    loss: {
      type: 'event'
    }
  },
  {
    /**
     * Builds a new `AudioFocus` request combining all the information.
     *
     * @memberof yodaRT.activity.Activity.AudioFocusClient
     * @instance
     * @function request
     * @param {object} [options] - the options.
     * @param {string} [options.gain=null] - gain types, "TRANSIENT", "TRANSIENT_EXCLUSIVE" and "TRANSIENT_MAY_DUCK".
     * @param {boolean} [options.acceptsDelayedFocusGain] marks this request as compatible with delayed focus.
     * @param {boolean} [options.forceDucking] marks this request as forcing ducking, 
     *                  regardless of the conditions in which the system would or would not enforce ducking.
     * @param {boolean} [options.pauseOnDucked] declares the intended behavior of the application with regards to audio ducking.
     * @returns {Promise<string>} the request id.
     */
    request: {
      type: 'method',
      returns: 'promise',
      fn: function requestAudioFocus (options) {
        // TODO
      }
    },
    /**
     * Abandon the given request by id.
     *
     * @memberof yodaRT.activity.Activity.AudioFocusClient
     * @instance
     * @function abandon
     * @param {string} id - the focus id.
     * @returns {Promise<boolean>} if successfully abandon.
     */
    abandon: {
      type: 'method',
      returns: 'promise',
      fn: function abandonAudioFocus (options) {
        // TODO
      }
    },
  }
)
