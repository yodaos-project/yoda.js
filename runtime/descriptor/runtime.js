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

  setPhase (phase) {
    if (phase === 'ready') {
      return this._runtime.phaseToReady()
    } else if (phase === 'reset') {
      return this._runtime.phaseToReset()
    }
  }

  idle () {
    return this._runtime.idle()
  }
}

RuntimeDescriptor.methods = {
  /**
   * Sets the runtime mode to `ready`, it should be triggered by an app,
   * that tells runtime it’s available.
   *
   * @memberof yodaRT.activity.Activity.RuntimeClient
   * @instance
   * @function setPhase
   * @returns {Promise<void>}
   */
  setPhase: {
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
