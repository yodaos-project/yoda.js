'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var logger = require('logger')('permission')

var _ = require('@yoda/util')._

function Permission (runtime) {
  EventEmitter.call(this)
  this.app_runtime = runtime
  // { appId: permission }
  this.permission = {}
}
inherits(Permission, EventEmitter)

/**
 * 添加应用权限配置
 * @param {string} appId 应用ID
 * @param {array} permission 权限配置
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
 * 检查是否具有某个权限
 * @param {string} appId
 * @param {string} name
 * @param {object} [options] -
 * @param {boolean} [options.acquiresActive=true] -
 */
Permission.prototype.check = function (appId, name, options) {
  var acquiresActive = _.get(options, 'acquiresActive', true)

  if (appId === undefined || name === undefined) {
    return false
  }
  // 判断App是否声明了权限
  if (this.permission[appId] && this.permission[appId][name] === true) {
    if (acquiresActive === false) {
      return true
    }
    /** no permission other than `INTERRUPT` shall be allow if app is not top of stack */
    var isActiveApp = appId === this.app_runtime.life.getCurrentAppId()
    if (!isActiveApp) {
      logger.info(`app has permission ${name}, but is not currently active app, denying.`, appId, this.app_runtime.life.getCurrentAppId())
    }
    return isActiveApp
  }
  return false
}

module.exports = Permission
