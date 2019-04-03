'use strict'
/**
 * @namespace yodaRT.activity
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = YodaDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class YodaClient
 * @hideconstructor
 * @extends EventEmitter
 */
function YodaDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(YodaDescriptor, EventEmitter)
YodaDescriptor.prototype.toJSON = function toJSON () {
  return YodaDescriptor.prototype
}

Object.assign(YodaDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    setup: {
      type: 'method',
      returns: 'promise',
      fn: function setup () {

      }
    },
    ready: {
      type: 'method',
      returns: 'promise',
      fn: function ready () {

      }
    }
  }
)
