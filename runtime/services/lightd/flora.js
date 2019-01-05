var logger = require('logger')('light-flora')
var inherits = require('util').inherits

var FloraComp = require('@yoda/flora/comp')
var Caps = require('@yoda/caps/caps.node').Caps
var property = require('@yoda/property')

var floraConfig = require('/etc/yoda/flora-config.json')

module.exports = Flora
/**
 *
 * @param {AppRuntime} runtime
 */
function Flora (light) {
  FloraComp.call(this, logger)
  this.light = light
}
inherits(Flora, FloraComp)
function isCaps (msg) {
  return typeof Caps === 'function' && (msg instanceof Caps)
}
Flora.prototype.handlers = {
  'rokid.turen.voice_coming': function (msg) {
    logger.log('voice coming')
    if (property.get('state.network.connected') !== 'true') {
      return
    }
    this.light.setAwake('@yoda')
  },
  'rokid.turen.local_awake': function (msg) {
    logger.log('voice local awake')
    if (property.get('state.network.connected') !== 'true') {
      return
    }
    var degree = msg[0]
    this.light.setDegree('@yoda', degree)
  },
  'rokid.lightd.global_alpha_factor': function (msg) {
    var alphaFactor = msg[0]
    logger.info(`global alpha factor ${alphaFactor}`)
    this.light.manager.setGlobalAlphaFactor(alphaFactor)
  }
}

/**
 * Initialize flora client.
 */
Flora.prototype.init = function init () {
  FloraComp.prototype.init.call(this, 'lightd', floraConfig)
}
