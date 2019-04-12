'use strict'
/**
 * @namespace yodaRT.activity
 */

var Descriptor = require('../lib/descriptor')

/**
 * @memberof yodaRT.activity.Activity
 * @class AudioFocusClient
 * @hideconstructor
 * @extends EventEmitter
 */
class AudioFocusDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'audioFocus')
  }

  requestAudioFocus (ctx) {
    // TODO
  }

  abandonAudioFocus (ctx) {
    // TODO
  }
}

AudioFocusDescriptor.events = {
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
}
AudioFocusDescriptor.methods = {
  /**
   * Builds a new `AudioFocus` request combining all the information.
   *
   * @memberof yodaRT.activity.Activity.AudioFocusClient
   * @instance
   * @function request
   * @param {object} [options] - the options.
   * @param {string} [options.gain=null] - gain types, "TRANSIENT", "TRANSIENT_EXCLUSIVE" and "TRANSIENT_MAY_DUCK".
   * @param {boolean} [options.acceptsDelayedFocusGain] marks this request as compatible with delayed focus.
   * @returns {Promise<string>} the request id.
   */
  request: {
    returns: 'promise'
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
    returns: 'promise'
  }
}

module.exports = AudioFocusDescriptor
