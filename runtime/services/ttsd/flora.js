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
    var reqId = this.tts.playingReqId
    if (this.tts.pausedReqIdOnAwaken != null && reqId == null) {
      logger.info('previously paused tts not been resumed yet, ' +
        'skip voice coming for no currently playing.')
      return
    }
    if (reqId == null) {
      logger.info('no currently tts playing requests, skipping.')
      return
    }
    var reqMemo = this.tts.requestMemo[reqId]
    if (reqMemo == null) {
      logger.warn(`unknown playing request(${reqId}), skipping.`)
      return
    }
    var masqueradeId = reqMemo.masqueradeId
    var appId = reqMemo.appId
    if (appId == null) {
      logger.error(`Un-owned tts request(${reqId})`)
      return
    }
    logger.info(`pausing tts(${reqId}${masqueradeId ? `, masquerading(${masqueradeId})` : ''}, app:${appId})`)
    if (masqueradeId != null) {
      reqId = masqueradeId
    }
    this.tts.pausedReqIdOnAwaken = reqId
    this.tts.pausedAppIdOnAwaken = appId
    return this.tts.pause(appId)
  }
}

/**
 * Initialize flora client.
 */
Flora.prototype.init = function init () {
  FloraComp.prototype.init.call(this, 'multimediad', floraConfig)
}
