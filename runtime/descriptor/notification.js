'use strict'
/**
 * @namespace yodaRT.activity
 */

var Descriptor = require('../lib/descriptor')

/**
 * @memberof yodaRT.activity.Activity
 * @class NotificationClient
 * @hideconstructor
 * @extends EventEmitter
 */
class NotificationDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'notification')
  }

  create (event) {
    // TODO:
  }

  cancel (id) {
    // TODO:
  }
}

/**
 * @typedef yodaRT.activity.Activity.NotificationClient~NotificationEvent
 * @property {string} id
 * @property {string} title
 * @property {string} sound
 * @property {object} payload
 * @property {number} delay
 */

NotificationDescriptor.events = {
  /**
   * Fires on notification requests.
   * @event yodaRT.activity.Activity.NotificationClient#notification
   * @param {yodaRT.activity.Activity.NotificationClient~NotificationEvent} event - the notfication event.
   */
  notification: {
    type: 'event'
  }
}
NotificationDescriptor.methods = {
  /**
   * Creates notification with customized scheduler.
   *
   * @memberof yodaRT.activity.Activity.NotificationClient
   * @instance
   * @function schedule
   * @param {yodaRT.activity.Activity.NotificationClient~NotificationEvent} event - the notification event.
   * @returns {Promise<string>} the notification id.
   */
  create: {
    returns: 'promise'
  },
  /**
   * Cancel the given notifcation by id.
   *
   * @memberof yodaRT.activity.Activity.NotificationClient
   * @instance
   * @function cancel
   * @param {string} id - the notification id.
   * @returns {Promise<void>}
   */
  cancel: {
    returns: 'promise'
  }
}

module.exports = NotificationDescriptor
