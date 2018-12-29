var logger = require('logger')('tts-flora')
var inherits = require('util').inherits

var FloraComp = require('@yoda/flora/comp')
var property = require('@yoda/property')
var floraConfig = require('/etc/yoda/flora-config.json')

module.exports = Flora
/**
 *
 * @param {AppRuntime} runtime
 */
function Flora (tts) {
  FloraComp.call(this, logger)
  this.tts = tts
}
inherits(Flora, FloraComp)

Flora.prototype.handlers = {
  'rokid.turen.voice_coming': function (msg) {
    logger.log('voice coming')
    if (property.get('state.network.connected') !== 'true') {
      return
    }
    var appId = this.tts.lastAppId
    if (this.tts.pausedAppIdOnAwaken != null && appId == null) {
      logger.info('previously paused tts not been resumed yet, ' +
        'skip voice coming for no currently playing.')
      return
    }
    this.tts.pausedAppIdOnAwaken = appId
    if (!appId) {
      logger.info('no currently tts playing app, skipping.')
      return
    }
    logger.info('pausing tts of app', appId)
    this.tts.pause(appId)
  }
}

/**
 * Initialize flora client.
 */
Flora.prototype.init = function init () {
  FloraComp.prototype.init.call(this, 'ttsd', floraConfig)
}
