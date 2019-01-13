var logger = require('logger')('media-flora')
var inherits = require('util').inherits

var FloraComp = require('@yoda/flora/comp')
var property = require('@yoda/property')

var floraConfig = require('/etc/yoda/flora-config.json')

module.exports = Flora
/**
 *
 * @param {AppRuntime} runtime
 */
function Flora (multimedia) {
  FloraComp.call(this, 'multimediad', floraConfig)
  this.multimedia = multimedia
}
inherits(Flora, FloraComp)

Flora.prototype.handlers = {
  'rokid.turen.voice_coming': function (msg) {
    logger.log('voice coming')
    if (property.get('state.network.connected') !== 'true') {
      return
    }
    var appId = this.multimedia.getCurrentlyPlayingAppId()
    if (this.multimedia.pausedAppIdOnAwaken != null && appId == null) {
      logger.info('previously paused media not been resumed yet, ' +
        'skip voice coming for no currently playing.')
      return
    }
    this.multimedia.pausedAppIdOnAwaken = appId
    if (!appId) {
      logger.info('no currently media playing app, skipping.')
      return
    }
    logger.info('pausing media of app', appId)
    this.multimedia.pause(appId)
  }
}

/**
 * Initialize flora client.
 */
Flora.prototype.init = function init () {
  FloraComp.prototype.init.call(this)
}
