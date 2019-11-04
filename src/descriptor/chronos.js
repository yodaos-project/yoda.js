'use strict'
/**
 * @namespace yodaRT.activity
 */

var Descriptor = require('../lib/descriptor')

/**
 * @memberof yodaRT.activity.Activity
 * @class ChronosClient
 * @hideconstructor
 * @extends EventEmitter
 */
class ChronosDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'chronos')
    this.chronos = this.component.chronos
  }

  schedule (ctx) {
    var job = ctx.args[0]
    this.chronos.schedule(job)
  }

  cancel (ctx) {
    var url = ctx.args[0]
    this.chronos.cancel(url)
  }
}

ChronosDescriptor.events = {
}
ChronosDescriptor.methods = {
  /**
   *
   * @memberof yodaRT.activity.Activity.ChronosClient
   * @instance
   * @function schedule
   * @returns {Promise<void>}
   */
  schedule: {
    returns: 'promise'
  },
  /**
   *
   * @memberof yodaRT.activity.Activity.ChronosClient
   * @instance
   * @function cancel
   * @returns {Promise<void>}
   */
  cancel: {
    returns: 'promise'
  }
}

module.exports = ChronosDescriptor
