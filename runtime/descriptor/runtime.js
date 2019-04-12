'use strict'
/**
 * @namespace yodaRT.activity
 */

var Descriptor = require('../lib/descriptor')

/**
 * @memberof yodaRT.activity.Activity
 * @class RuntimeClient
 * @hideconstructor
 * @extends EventEmitter
 */
class RuntimeDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'runtime')
  }

  setMode (mode) {
    // TODO
  }

  idle () {
    return this._runtime.idle()
  }
}

RuntimeDescriptor.methods = {
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
    returns: 'promise'
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
    returns: 'promise'
  }
}

module.exports = RuntimeDescriptor
