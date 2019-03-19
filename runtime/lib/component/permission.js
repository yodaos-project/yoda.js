'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var logger = require('logger')('permission')

var _ = require('@yoda/util')._

function Permission (runtime) {
  EventEmitter.call(this)
  this.component = runtime.component
  // { appId: permission }
  this.permission = {}
}
inherits(Permission, EventEmitter)

/**
 * Add the application permission config by the given `appId`.
 * @param {string} appId
 * @param {array} permission
 */
Permission.prototype.load = function (appId, permission) {
  if (appId !== undefined) {
    this.permission[appId] = {}
    for (var i = 0; i < permission.length; i++) {
      this.permission[appId][permission[i]] = true
    }
  }
}

/**
 * Check if the `appId` owns the permission.
 * @param {string} appId
 * @param {string} name
 * @param {object} [options] -
 * @param {boolean} [options.acquiresActive=true] -
 */
Permission.prototype.check = function (appId, name, options) {
  var acquiresActive = _.get(options, 'acquiresActive', true)

  if (appId === undefined) {
    return false
  }
  var isActiveApp = appId === this.component.lifetime.getCurrentAppId()

  if (name === undefined) {
    if (!isActiveApp) {
      logger.info(`app is not currently active app, denying.`, appId, this.component.lifetime.getCurrentAppId())
    }
    return isActiveApp
  }

  // check if the app does specify the permission.
  if (this.permission[appId] && this.permission[appId][name] === true) {
    if (acquiresActive === false) {
      return true
    }
    /** no permission other than `INTERRUPT` shall be allow if app is not top of stack */
    if (!isActiveApp) {
      logger.info(`app has permission ${name}, but is not currently active app, denying.`, appId, this.component.lifetime.getCurrentAppId())
    }
    return isActiveApp
  }
  return false
}

module.exports = Permission
