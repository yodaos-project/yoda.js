'use strict'
/**
 * @namespace yodaRT.activity
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = NotificationDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class NotificationClient
 * @hideconstructor
 * @extends EventEmitter
 */
function NotificationDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(NotificationDescriptor, EventEmitter)
NotificationDescriptor.prototype.toJSON = function toJSON () {
  return NotificationDescriptor.prototype
}

/**
 * @typedef yodaRT.activity.Activity.NotificationClient~NotificationEvent
 * @property {string} id
 * @property {string} title
 * @property {string} sound
 * @property {object} payload
 * @property {number} delay
 */

Object.assign(NotificationDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * Fires on notification requests.
     * @event yodaRT.activity.Activity.NotificationClient#notify
     * @param {yodaRT.activity.Activity.NotificationClient~NotificationEvent} event - the notfication event.
     */
    notification: {
      type: 'event'
    }
  },
  {
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
      type: 'method',
      returns: 'promise',
      fn: function createNotification (event) {
        return this._runtime.createNotification(event)
      }
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
      type: 'method',
      returns: 'promise',
      fn: function cancelNotification (id) {
        return this._runtime.cancelNotification(id)
      }
    }
  }
)
