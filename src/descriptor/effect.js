'use strict'
/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')

var yodaPath = require('@yoda/util').path
var Descriptor = require('../lib/descriptor')
var LIGHT_SOURCE = '/opt/light'

/**
 * @memberof yodaRT.activity.Activity
 * @class EffectClient
 * @hideconstructor
 * @extends EventEmitter
 */
class EffectDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'effect')
  }

  play (ctx) {
    var uri = ctx.args[0]
    var args = ctx.args[1]
    var options = ctx.args[2]
    var absPath = yodaPath.transformPathScheme(uri, LIGHT_SOURCE, ctx.appHome + '/light')
    logger.log('playing effect', absPath)
    return this.component.effect.play(ctx.appId, absPath, args || {}, options || {})
      .then((res) => {
        if (res && res[0] === true) {
          return
        }
        throw new Error('unknown effect error')
      })
  }

  stop (ctx) {
    var uri = ctx.args[0]
    var future
    if (uri && typeof uri === 'string') {
      var absPath = yodaPath.transformPathScheme(uri, LIGHT_SOURCE, ctx.appHome + '/light')
      future = this.component.effect.stop(ctx.appId, absPath)
    } else {
      /** stop all effects belonging to the app */
      future = this.component.effect.stopByAppId(ctx.appId)
    }
    return future
      .then((res) => {
        if (res && res[0] === true) {
          return
        }
        throw new Error('stop effect failed')
      })
  }
}

EffectDescriptor.methods = {
  /**
   * play the given effect
   * @memberof yodaRT.activity.Activity.EffectClient
   * @instance
   * @function play
   * @param {string} uri - the effect resource uri.
   * @param {object} args - the args.
   * @param {object} [options]
   * @param {number} [options.zIndex] number of layers to play. default minimum layer
   * @param {boolean} [options.shouldResume]
   * @returns {Promise<void>}
   */
  play: {
    returns: 'promise'
  },
  /**
   * stop the given effect and clear from the recovery queue
   * @memberof yodaRT.activity.Activity.EffectClient
   * @instance
   * @function stop
   * @param {string} [uri] - the effect resource uri.
   * @returns {Promise<void>}
   */
  stop: {
    returns: 'promise'
  }
}

module.exports = EffectDescriptor
