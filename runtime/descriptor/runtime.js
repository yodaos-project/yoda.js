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

  setPhase (ctx) {
    var phase = ctx.args[0]
    if (phase === 'ready') {
      return this.runtime.phaseToReady()
    } else if (phase === 'reset') {
      return this.runtime.phaseToReset()
    }
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
  }
}

module.exports = RuntimeDescriptor
