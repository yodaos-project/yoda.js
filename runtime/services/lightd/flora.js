var logger = require('logger')('light-flora')
var inherits = require('util').inherits

var FloraComp = require('@yoda/flora/comp')
var floraConfig = require('../../lib/config').getConfig('flora-config.json')

var SETPICKUPURI = '/opt/light/setPickup.js'

module.exports = Flora
/**
 *
 * @param {AppRuntime} runtime
 */
function Flora (light) {
  FloraComp.call(this, 'lightd', floraConfig)
  this.light = light
  this.wakeUri = '/opt/light/awake.js'
  this.runtimePhase = 'boot'
}
inherits(Flora, FloraComp)

Flora.prototype.handlers = {
  'rokid.turen.voice_coming': function (msg) {
    logger.log('voice coming')
    if (this.runtimePhase !== 'ready') {
      logger.info('runtime not ready, skipping')
      return
    }
    if (!this.voiceInterfaceAvailable) {
      logger.info('voice interface not available, skipping')
      return
    }
    this.light.loadfile('@yoda', this.wakeUri, {}, {})
  },
  'rokid.turen.end_voice': function (msg) {
    logger.log('rokid.turen.end_voice')
    this.light.stopFile('@yoda', SETPICKUPURI)
    this.light.stopFile('@yoda', this.wakeUri)
  },
  'rokid.turen.local_awake': function (msg) {
    logger.log('voice local awake', msg)
    if (this.runtimePhase !== 'ready') {
      logger.info('runtime not ready, skipping')
      return
    }
    var degree = msg[0]
    this.light.loadfile('@yoda', this.wakeUri, { degree: degree }, { shouldResume: true })
  },
  'rokid.lightd.global_alpha_factor': function (msg) {
    var alphaFactor = msg[0]
    logger.info(`global alpha factor ${alphaFactor}`)
    this.light.manager.setGlobalAlphaFactor(alphaFactor)
  },
  'yodaos.runtime.phase': function (msg) {
    this.runtimePhase = msg[0]
    logger.info('applied runtime phase', this.runtimePhase)
  },
  'yodaos.voice-interface.availability': function (msg) {
    this.voiceInterfaceAvailable = msg[0] === 1
    logger.info(`applied voice interface availability '${this.voiceInterfaceAvailable}'`)
  }
}

/**
 * Initialize flora client.
 */
Flora.prototype.init = function init () {
  FloraComp.prototype.init.call(this)
}
