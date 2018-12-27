'use strict'
/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

var yodaPath = require('@yoda/util').path

var LIGHT_SOURCE = '/opt/light'

module.exports = LightDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class LightClient
 * @hideconstructor
 * @extends EventEmitter
 */
function LightDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(LightDescriptor, EventEmitter)
LightDescriptor.prototype.toJSON = function toJSON () {
  return LightDescriptor.prototype
}

Object.assign(LightDescriptor.prototype,
  {
    type: 'namespace'
  },
  {

    /**
     * play the given light effect
     * @memberof yodaRT.activity.Activity.LightClient
     * @instance
     * @function play
     * @param {string} uri - the light resource uri.
     * @param {object} args - the args.
     * @param {object} [options]
     * @param {number} [options.zIndex] number of layers to play. default minimum layer
     * @param {boolean} [options.shouldResume]
     * @returns {Promise<void>}
     */
    play: {
      type: 'method',
      returns: 'promise',
      fn: function play (uri, args, options) {
        var absPath = yodaPath.transformPathScheme(uri, LIGHT_SOURCE, this._appHome + '/light')
        logger.log('playing light effect', absPath)
        return this._runtime.light.play(this._appId, absPath, args || {}, options || {})
          .then((res) => {
            if (res && res[0] === true) {
              return
            }
            throw new Error('unknown light error')
          })
      }
    },
    /**
     * stop the given light effect and clear from the recovery queue
     * @memberof yodaRT.activity.Activity.LightClient
     * @instance
     * @function stop
     * @param {string} [uri] - the light resource uri.
     * @returns {Promise<void>}
     */
    stop: {
      type: 'method',
      returns: 'promise',
      fn: function stop (uri) {
        var future
        if (uri && typeof uri === 'string') {
          var absPath = yodaPath.transformPathScheme(uri, LIGHT_SOURCE, this._appHome + '/light')
          future = this._runtime.light.stop(this._appId, absPath)
        } else {
          /** stop all light effects belonging to the app */
          future = this._runtime.light.stopByAppId(this._appId)
        }
        return future
          .then((res) => {
            if (res && res[0] === true) {
              return
            }
            throw new Error('stop light failed')
          })
      }
    }
  }
)
