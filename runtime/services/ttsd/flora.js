var logger = require('logger')('tts-flora')
var inherits = require('util').inherits

var FloraComp = require('@yoda/flora/comp')
var property = require('@yoda/property')
var env = require('@yoda/env')()
var _ = require('@yoda/util')._
var floraConfig = require('/etc/yoda/flora-config.json')

module.exports = Flora
/**
 *
 * @param {Tts} tts
 */
function Flora (tts) {
  FloraComp.call(this, 'ttsd', floraConfig)
  this.tts = tts

  ;['start',
    'end',
    'cancel',
    'error'
  ].forEach(it => {
    var self = this
    self.tts.on(it, function () {
      logger.debug('emitting tts event', it)
      /** msg: [ event, ttsId, appId, Optional(errno) ] */
      self.agent.post('yodart.ttsd.event', [it].concat(Array.prototype.slice.call(arguments, 0)))
    })
  })
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
    this.tts.pausedReqIdOnAwaken = reqId
    if (reqId == null) {
      logger.info('no currently tts playing requests, skipping.')
      return
    }
    var appId = _.get(this.tts.requestMemo[reqId], 'appId')
    if (appId == null) {
      logger.error(`Un-owned tts request(${reqId})`)
      return
    }
    logger.info(`pausing tts(${reqId}, app:${appId})`)
    return this.tts.pause(appId)
  },
  'yodart.vui.logged-in': function onVuiLoggedIn (msg) {
    var config = msg[0]
    logger.log('ttsd restart trigger by upadte config')
    config = JSON.parse(config)
    config = Object.assign({}, config, { host: env.cloudgw.wss })
    this.tts.connect(config)
  }
}

Flora.prototype.remoteMethods = {
  'yodart.ttsd.speak': function speak (reqMsg, res) {
    var appId = reqMsg[0]
    var text = reqMsg[1]
    if (!appId || !text) {
      // TODO: error handler?
      logger.error(`unexpected arguments: appId and text expected`, appId, text)
      return res.end(0, [ '-1' ])
    }
    logger.log(`speak request: ${text} ${appId}`)

    var id = this.tts.speak(appId, text)
    logger.log('tts speak requested:', id)
    res.end(0, [ '' + id ])
  },
  'yodart.ttsd.stop': function stop (reqMsg, res) {
    var appId = reqMsg[0]
    logger.log('tts cancel', appId)

    if (!appId) {
      return res.end(0, [ false ])
    }
    this.tts.stop(appId)
    res.end(0, [ true ])
  },
  'yodart.ttsd.reset': function reset (reqMsg, res) {
    logger.log('reset ttsd requested by vui')
    this.tts.reset()
    res.end(0, [ true ])
  },
  'yodart.ttsd.pause': function pause (reqMsg, res) {
    var appId = reqMsg[0]
    if (!appId) {
      logger.warn('ignore tts pause by OS because not given appId')
      return res.end(0, [ true ])
    }
    logger.log(`tts pause by OS with appId: ${appId}`)
    this.tts.pause(appId)
    res.end(0, [true])
  },
  'yodart.ttsd.resume': function resume (reqMsg, res) {
    var appId = reqMsg[0]
    logger.info('tts resume to true')
    this.tts.resume(appId)
    res.end(null, [true])
  },
  'yodart.ttsd.resetAwaken': function resetAwaken (reqMsg, res) {
    var appId = reqMsg[0]
    var pausedReqIdOnAwaken = this.tts.pausedReqIdOnAwaken
    this.tts.pausedReqIdOnAwaken = null

    var appMemo = this.tts.appRequestMemo[appId]
    if (appMemo == null) {
      logger.info(`reset awaken requested by vui, yet doesn't have any memo of app(${appId})`)
      return res.end(0, [ false ])
    }
    if (appMemo.reqId !== pausedReqIdOnAwaken) {
      logger.info(`reset awaken requested by vui, yet app(${appId}) may have requested new speak`)
      return res.end(0, [ false ])
    }
    logger.log(`reset awaken requested by vui, resuming app(${appId})`)
    this.tts.resume(appId)
    res.end(0, [true])
  },
  'yodart.ttsd.debug.get-status': function getStatus (reqMsg, res) {
    var obj = _.pick(this.tts,
      'requestMemo',
      'appRequestMemo',
      'playingReqId',
      'pausedReqIdOnAwaken'
    )
    res.end(0, [JSON.stringify(obj)])
  }
}

/**
 * Initialize flora client.
 */
Flora.prototype.init = function init () {
  FloraComp.prototype.init.call(this)
}
