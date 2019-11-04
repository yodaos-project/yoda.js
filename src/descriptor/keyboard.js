'use strict'
/**
 * @namespace yodaRT.activity
 */

var Descriptor = require('../lib/descriptor')

/**
 * @memberof yodaRT.activity.Activity
 * @class KeyboardClient
 * @hideconstructor
 * @extends EventEmitter
 */
class KeyboardDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'keyboard')

    this.events = [ 'keydown', 'keyup', 'click', 'dbclick', 'longpress' ]
  }

  preventDefaults (ctx) {
    var appId = ctx.appId
    var keyCode = ctx.args[0]
    var event = ctx.args[1]

    if (typeof keyCode !== 'number') {
      return Promise.reject(new Error('Expect a number on first argument of keyboard.preventDefaults.'))
    }
    var events = this.events
    if (event != null) {
      if (typeof event !== 'string') {
        return Promise.reject(new Error('Expect a string on second argument of keyboard.preventDefaults.'))
      }
      if (this.events.indexOf(event) === -1) {
        return Promise.reject(new Error(`Unexpected keyboard event: ${event}.`))
      }
      events = [ event ]
    }
    this.component.keyboard.preventDefaults(appId, keyCode, events)
  }

  restoreDefaults (ctx) {
    var appId = ctx.appId
    var keyCode = ctx.args[0]
    var event = ctx.args[1]

    if (typeof keyCode !== 'number') {
      return Promise.reject(new Error('Expect a string on first argument of keyboard.restoreDefaults.'))
    }
    var events = this.events
    if (event != null) {
      if (typeof event !== 'string') {
        return Promise.reject(new Error('Expect a string on second argument of keyboard.restoreDefaults.'))
      }
      if (events.indexOf(event) === -1) {
        return Promise.reject(new Error(`Unexpected keyboard event: ${event}.`))
      }
      events = [ event ]
    }

    this.component.keyboard.restoreDefaults(appId, keyCode, events)
  }

  restoreAll (ctx) {
    var appId = ctx.appId
    this.component.keyboard.restoreAll(appId)
  }
}

KeyboardDescriptor.events = {
  /**
   * @event yodaRT.activity.Activity.KeyboardClient#keydown
   * @param {object} event -
   * @param {number} event.keyCode -
   */
  keydown: {
    type: 'event'
  },
  /**
   * @event yodaRT.activity.Activity.KeyboardClient#keyup
   * @param {object} event -
   * @param {number} event.keyCode -
   */
  keyup: {
    type: 'event'
  },
  /**
   * @event yodaRT.activity.Activity.KeyboardClient#click
   * @param {object} event -
   * @param {number} event.keyCode -
   */
  click: {
    type: 'event'
  },
  /**
   * @event yodaRT.activity.Activity.KeyboardClient#dblclick
   * @param {object} event -
   * @param {number} event.keyCode -
   */
  dblclick: {
    type: 'event'
  },
  /**
   * @event yodaRT.activity.Activity.KeyboardClient#longpress
   * @param {object} event -
   * @param {number} event.keyCode -
   */
  longpress: {
    type: 'event'
  }
}

KeyboardDescriptor.methods = {
  /**
   * Intercepts all events for key code until restores default behavior by KeyboardClient.restoreDefaults
   *
   * @memberof yodaRT.activity.Activity.KeyboardClient
   * @instance
   * @function preventDefaults
   * @param {number} keyCode -
   * @param {string} event -
   * @returns {Promise<void>}
   */
  preventDefaults: {
    returns: 'promise'
  },
  /**
   * Restore default behavior of key code.
   *
   * @memberof yodaRT.activity.Activity.KeyboardClient
   * @instance
   * @function restoreDefaults
   * @param {number} keyCode -
   * @param {string} event -
   * @returns {Promise<void>}
   */
  restoreDefaults: {
    returns: 'promise'
  },
  /**
   * Restore default behavior of all key codes.
   *
   * @memberof yodaRT.activity.Activity.KeyboardClient
   * @instance
   * @function restoreAll
   * @returns {Promise<void>}
   */
  restoreAll: {
    returns: 'promise'
  }
}

module.exports = KeyboardDescriptor
