'use strict'

var logger = require('logger')('ttsdService')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

var property = require('@yoda/property')
var TtsWrap = require('@yoda/tts')
var AudioManager = require('@yoda/audio').AudioManager

var audioModuleName = 'tts'

function Tts (lightd) {
  EventEmitter.call(this)
  this.lightd = lightd

  this.config = undefined
  this.nativeWrap = undefined

  /**
   * keyed by request id
   * @type {{ [key: string]: { appId: string, req: TtsRequest, staredAt?: number, eventMasked?: boolean, masqueradeId? string } }}
   */
  this.requestMemo = {}
  /**
   * keyed by app id
   * @type {{ [key: string]: { reqId?: string, text: string } }}
   */
  this.appRequestMemo = {}

  this.playingReqId = null
  this.pausedReqIdOnAwaken = null

  AudioManager.setPlayingState(audioModuleName, false)
}
inherits(Tts, EventEmitter)

Tts.prototype.speak = function (appId, text) {
  var appMemo = this.appRequestMemo[appId]
  var reqId = appMemo ? appMemo.reqId : undefined
  var reqMemo = reqId == null ? undefined : this.requestMemo[reqId]
  if (reqMemo) {
    try {
      reqMemo.req.stop()
    } catch (err) {
      logger.error(`stop previous tts(appId:${appId}, reqId:${reqId}) failed for ${err.stack}`)
      this.clearMemo(appId, reqId)
      return -1
    }
  } else if (reqId != null) {
    logger.info(`req(${reqId}) was possibly been paused, emit masqueraded cancel event`)
    this.emit('cancel', reqId, appId)
  }

  var req
  try {
    req = this.nativeWrap.speak(text)
  } catch (err) {
    logger.error('requesting tts failed', err.stack)
    return -1
  }
  reqId = req.id
  reqMemo = { appId: appId, req: req }
  this.requestMemo[reqId] = reqMemo
  this.appRequestMemo[appId] = { reqId: reqId, text: text }
  return reqId
}

Tts.prototype.stop = function (appId) {
  var appMemo = this.appRequestMemo[appId]
  if (appMemo == null) {
    logger.info(`app(${appId}) doesn't own any active requests`)
    return false
  }
  var reqId = appMemo.reqId
  var reqMemo = reqId == null ? undefined : this.requestMemo[reqId]

  var status = true
  if (reqMemo == null) {
    logger.info(`req(${reqId}) was possibly been paused, emit masqueraded cancel event`)
    this.emit('cancel', reqId, appId)
    return
  }

  try {
    reqMemo.req.stop()
  } catch (err) {
    logger.error(`stop tts(appId:${appId}, reqId:${reqId}) failed for ${err.stack}`)
    status = false
  }

  delete this.appRequestMemo[appId]
  return status
}

Tts.prototype.pause = function (appId) {
  var appMemo = this.appRequestMemo[appId]
  if (appMemo == null) {
    logger.info(`app(${appId}) doesn't own any active requests`)
    return false
  }
  var reqId = appMemo.reqId
  var reqMemo = reqId == null ? undefined : this.requestMemo[reqId]

  var status = true
  if (reqMemo == null) {
    return status
  }
  if (reqMemo.masqueradeId != null) {
    appMemo.reqId = reqMemo.masqueradeId
  }
  reqMemo.eventMasked = true
  try {
    reqMemo.req.stop()
  } catch (err) {
    logger.error(`stop tts(appId:${appId}, reqId:${reqId}) failed for ${err.stack}`)
    status = false
  }
  /** just cleaning request memo, leaving app memo for later resuming. */
  return status
}

Tts.prototype.resume = function (appId) {
  var appMemo = this.appRequestMemo[appId]
  if (appMemo == null) {
    logger.info(`app(${appId}) doesn't own any active requests`)
    return false
  }
  var reqId = appMemo.reqId
  var reqMemo = reqId == null ? undefined : this.requestMemo[reqId]

  if (reqMemo) {
    logger.info(`app(${appId}) already have active request(${reqId}), skip resuming`)
    return
  }

  var req
  try {
    req = this.nativeWrap.speak(appMemo.text)
  } catch (err) {
    logger.error('requesting tts failed', err.stack)
    return -1
  }
  reqMemo = { appId: appId, req: req, masqueradeId: reqId }
  reqId = req.id
  this.requestMemo[reqId] = reqMemo
  this.appRequestMemo[appId].reqId = reqId
  return reqId
}

Tts.prototype.clearMemo = function (appId, reqId) {
  delete this.requestMemo[reqId]
  delete this.appRequestMemo[appId]
}

Tts.prototype.reset = function () {
  Object.keys(this.requestMemo).forEach(reqId => {
    var memo = this.requestMemo[reqId]
    try {
      memo.req.stop()
    } catch (err) {
      logger.error(`unexpected error on stopping tts(${reqId}, appId: ${memo.appId})`)
    }
  })
  this.requestMemo = {}
  this.appRequestMemo = {}
}

Tts.prototype.onStart = function onStart (reqId) {
  logger.log('ttsd start', reqId)
  AudioManager.setPlayingState(audioModuleName, true)
  this.lightd.invoke('play',
    ['@yoda/ttsd', '/opt/light/setSpeaking.js', '{}', '{"shouldResume":true}'])
  this.playingReqId = reqId

  var memo = this.requestMemo[reqId]
  if (memo == null) {
    logger.error(`un-owned tts(${reqId}).`)
    return
  }
  memo.staredAt = Date.now()
  if (memo.eventMasked === true) {
    logger.log(`ignore tts start event with id: ${reqId}`)
    return
  }
  var masqueradeId = memo.masqueradeId
  if (masqueradeId != null) {
    logger.info(`req(${reqId}) was masquerading req(${masqueradeId}), skip start event`)
    return
  }
  this.emit('start', reqId, memo.appId)
}

Tts.prototype.onTtsTermination = function onTtsTermination (event, reqId, errno) {
  logger.info(`ttsd ${event} ${reqId}`)
  AudioManager.setPlayingState(audioModuleName, false)
  this.lightd.invoke('stop', ['@yoda/ttsd', '/opt/light/setSpeaking.js'])
  if (this.playingReqId === reqId) {
    this.playingReqId = null
  }

  var memo = this.requestMemo[reqId]
  delete this.requestMemo[reqId]
  if (memo == null) {
    logger.error(`un-owned tts(${reqId}).`)
    return
  }

  if (memo.eventMasked) {
    logger.info(`ignore tts ${event} event with id: ${reqId}`)
    return
  }
  var start = memo.staredAt || 0
  var appId = memo.appId
  var delta = Date.now() - start

  var masqueradeId = memo.masqueradeId
  if (masqueradeId != null) {
    reqId = masqueradeId
  }
  /** delay to 2s to prevent event `end` been received before event `start` */
  setTimeout(() => {
    this.emit(event, reqId, appId, errno)
  }, 2000 - delta/** it's ok to set a negative timeout */)
}

Tts.prototype.connect = function connect (CONFIG) {
  if (this.config &&
    this.config.deviceId === CONFIG.deviceId &&
    this.config.deviceTypeId === CONFIG.deviceTypeId &&
    this.config.key === CONFIG.key &&
    this.config.secret === CONFIG.secret) {
    logger.log('reconnect with same config')
    this.nativeWrap.reconnect()
    return
  }
  // for detail, see https://developer.rokid.com/docs/3-ApiReference/openvoice-api.html#ttsrequest
  CONFIG.declaimer = property.get('rokid.tts.declaimer', 'persist')
  CONFIG.holdConnect = true
  if (property.get('player.ttsd.holdcon', 'persist') === '0') {
    CONFIG.holdConnect = false
  }
  if (this.nativeWrap) {
    this.nativeWrap.disconnect()
  }

  this.nativeWrap = TtsWrap.createTts(CONFIG)
  this.config = CONFIG

  this.nativeWrap.on('start', this.onStart.bind(this))
  this.nativeWrap.on('end', this.onTtsTermination.bind(this, 'end'))
  this.nativeWrap.on('cancel', this.onTtsTermination.bind(this, 'cancel'))
  this.nativeWrap.on('error', this.onTtsTermination.bind(this, 'error'))
}

module.exports = Tts
