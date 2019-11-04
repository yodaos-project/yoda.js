'use strict'
/**
 * @namespace yodaRT.activity
 */

var Descriptor = require('../lib/descriptor')

/**
 * @memberof yodaRT.activity.Broadcast
 * @class BroadcastClient
 * @hideconstructor
 * @extends EventEmitter
 */
class BroadcastDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'broadcast')
  }

  registerBroadcast (ctx) {
    var appId = ctx.appId
    var channel = ctx.args[0]
    if (typeof channel !== 'string') {
      throw new Error('Expect a string on first argument of registerBroadcast')
    }
    return this.component.broadcast.registerBroadcastReceiver(channel, appId)
  }

  unregisterBroadcast (ctx) {
    var appId = ctx.appId
    var channel = ctx.args[0]
    if (typeof channel !== 'string') {
      throw new Error('Expect a string on first argument of unregisterBroadcast')
    }
    this.component.broadcast.unregisterBroadcastReceiver(channel, appId)
  }
}

BroadcastDescriptor.events = {
  /**
   * Fires on events.
   * @event yodaRT.activity.Broadcast#broadcast
   * @param {string} channel - the broadcast channel name.
   * @param {object} data - the broadcast data.
   */
  broadcast: {}
}
BroadcastDescriptor.methods = {
  /**
   * Register the interest of the broadcast channel.
   *
   * @memberof yodaRT.activity.Activity.Broadcast
   * @instance
   * @function registerBroadcast
   * @param {string} channel - broadcast channel channel name.
   * @returns {Promise<void>}
   */
  registerBroadcast: {
    returns: 'promise'
  },
  /**
   * Unregister the interest of the broadcast channel.
   *
   * @memberof yodaRT.activity.Activity.Broadcast
   * @instance
   * @function unregisterBroadcast
   * @param {string} channel - broadcast channel channel name.
   * @returns {Promise<void>}
   */
  unregisterBroadcast: {
    returns: 'promise'
  }
}

module.exports = BroadcastDescriptor
