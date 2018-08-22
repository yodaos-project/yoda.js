'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var createActivity = require('./activity').createActivity
var logger = require('logger')('lightApp')

function Client (appId, runtime) {
  EventEmitter.call(this)

  var Adapter = runtime.adapter
  this.appHome = ''
  this.runtime = runtime
  this.appId = appId

  this.on('create', this._onCreate.bind(this))
  this.on('pause', this._onPaused.bind(this))
  this.on('resume', this._onResumed.bind(this))
  this.on('destroy', this._onDestroyed.bind(this))
  this.on('voice_command', this._onVoiceCommand.bind(this))
  this.on('key_event', this._onKeyEvent.bind(this))

  var adapter = this.adapter = new Adapter(runtime.service)
  this.ttsCallback = {}

  adapter.listenTtsdEvent((name, args) => {
    // ttsd的event事件
    if (name === 'ttsdevent') {
      logger.log('tts-event', args)
      if (typeof this.ttsCallback['ttscb:' + args[0]] === 'function') {
        this.ttsCallback['ttscb:' + args[0]](args[1], args.slice(2))
        // 下面事件完成后不会再触发其它事件，也不应该触发，删除对应cb，防止内存泄漏
        logger.log('unregister', args[0])
        delete this.ttsCallback['ttscb:' + args[0]]
      }
    }
  }).catch((err) => {
    logger.log('ttsd listen error', err)
  })

  this.multiMediaCallback = {}
  adapter.listenMultimediadEvent((name, args) => {
    if (name === 'multimediadevent') {
      logger.log('media-event', args)
      if (typeof this.multiMediaCallback['mediacb:' + args[0]] === 'function') {
        this.multiMediaCallback['mediacb:' + args[0]](args.slice(1))
      }
    }
  }).catch((err) => {
    logger.log('mediad listen error', err)
  })

  // 创建隔离的App
  this.app = createActivity(appId, this)
}
inherits(Client, EventEmitter)

Client.prototype._onCreate = function () {
  this.state = 'created'
  this.app.emit('created')
}

Client.prototype._onPaused = function () {
  this.state = 'paused'
  this.app.emit('paused')
}

Client.prototype._onResumed = function () {
  this.state = 'resumed'
  this.app.emit('resumed')
}

Client.prototype._onDestroyed = function () {
  this.state = 'destroyed'
  this.app.emit('destroyed')
}

Client.prototype._onVoiceCommand = function (nlp, action) {
  this.state = 'voice_command'
  this.app.emit('onrequest', nlp, action)
}

Client.prototype._onKeyEvent = function () {
  this.app.emit('keyEvent')
}

Client.prototype.exit = function () {
  this.runtime.exitAppById(this.appId)
}

module.exports = Client
