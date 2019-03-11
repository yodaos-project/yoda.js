var ContextManager = require('@yodaos/application/context-manager')
var logger = require('logger')('custom-config-wakeup')
var EventEmitter = require('events').EventEmitter


class IntentQueue extends EventEmitter {
  constructor (activity, channelMap) {
    super()
    this.ctxMgr = new ContextManager(activity)
    this.ctxMgr.on('request', this._onRequest)
    this.ctxMgr.on('url', this._onUrl)
    this.activity = activity
    this.channelList = []
    this.intentRouter = {}
    if (channelMap) {
      Object.keys(channelMap).forEach((key) => {
        if (Array.isArray(channelMap[key]) && channelMap[key].length > 0) {
          var channel = new IntentChannel(key, this._onChannelIdle.bind(this))
          this.channelList[key] = channel
          channelMap[key].forEach((intentName) => {
            this.intentRouter[intentName] = channel
          })
        }
      })
    } else {
      this.channelList['default'] = new IntentChannel('default', this._onChannelIdle.bind(this))
    }
  }

  _onChannelIdle (channel) {
    var nextIntent = channel.pop()
    if (nextIntent) {
      this.emit('intent', nextIntent)
    }
  }

  _onRequest (ctx) {
    var channelName = this.emit('intent', ctx.nlp, IntentQueue.NLP)
    this.push(channelName, ctx.nlp, IntentQueue.NLP)
  }

  _onUrl (ctx) {
    if (typeof this.sorter === 'function') {
      this.push(channelName, ctx.urlObj, IntentQueue.URL)
    } else {
      this.push('defualt', ctx.urlObj, IntentQueue.URL)
    }
  }

  push(channel, intent, type) {
    if (!this.channelList[channel]) {
      this.channelList[channel] = new IntentChannel(channel, this._onChannelIdle.bind(this))
    }
    this.channelList[channel].push(intent, type)
  }
}

IntentQueue.NLP = 'NLP'
IntentQueue.URL = 'URL'

class IntentChannel extends EventEmitter {
  constructor (name, intentHandler, channelIdleHandler) {
    super()
    this.name = name
    this.intentList = []
    this.isIdle = true
  }

  push (intent, type) {
    if (this.isIdle) {
      this.intentHandler(new IntentObj(intent, type, this.onChannelIdle.bind(this)))
    } else {
      this.intentList.push(new IntentObj(intent, type, this.onChannelIdle.bind(this)))
    }
  }

  pop () {
    return this.intentList.pop()
  }

  onChannelIdle (intent, type) {
    this.isIdle = true
    this.emit('channelIdle', this)
  }
}

class IntentObj {
  constructor (intent, type, doneHandler) {
    this.intent = intent
    this.type = type
    this.future = null
    this.doneHandler = doneHandler
  }

  abort () {
    if (this.future && typeof (this.future.abort === 'function')) {
      this.future.abort()
    }
  }
  done () {
    process.nextTick(() => {
      this.doneHandler(this.intent, this.type)
    })
  }
}

module.exports = IntentQueue