'use strict'

var logger = require('logger')('lightService')
var LightRenderingContextManager = require('./effects')

var LIGHT_SOURCE = '/opt/light/'

var setAwake = require(`${LIGHT_SOURCE}awake.js`)
var setSpeaking = require(`${LIGHT_SOURCE}setSpeaking.js`)

var manager = new LightRenderingContextManager()

function Light (options) {
  this.playerHandle = {}
  this.options = options
  this.prev = null
  this.currentContext = null
  this.degree = 0
  this.init()
}

Light.prototype.init = function () {
  // TODO
  this.setHide()
}

Light.prototype.getContext = function () {
  var self = this
  var context = manager.getContext()
  this.currentContext = context
  context._getCurrentId = function () {
    if (self.currentContext) {
      return self.currentContext._id
    }
    return -1
  }
  return context
}

Light.prototype.stopPrev = function (keep) {
  if (this.prev) {
    if (typeof this.prev === 'function') {
      this.prev(keep)
    } else if (this.prev && typeof this.prev.stop === 'function') {
      this.prev.stop(keep)
    }
    this.prev = null
  }
  this.currentContext = null
}

Light.prototype.loadfile = function (uri, data, callback) {
  var handle
  try {
    handle = require(uri)
    this.stopPrev(data && data.keep)
    var context = this.getContext()
    this.prev = handle(context, data || {}, dedup(callback))
  } catch (error) {
    logger.error(`load effect file error from path: ${uri}`, error)
    callback(error)
  }
}

Light.prototype.setAwake = function () {
  this.stopPrev()
  var context = this.getContext()
  this.prev = setAwake(context, {}, function noop () {})
  this.prev.name = 'setAwake'
}

Light.prototype.setDegree = function (degree) {
  if (this.prev && this.prev.name === 'setAwake') {
    this.degree = +degree
    this.prev.setDegree(+degree)
  }
}

Light.prototype.setHide = function () {
  this.stopPrev()
  if (this.currentContext) {
    this.currentContext.stop()
    this.currentContext.clear()
    this.currentContext.render()
  }
}

Light.prototype.setLoading = function () {
  if (this.prev) {
    if (typeof this.prev === 'object' && this.prev.name === 'setAwake') {
      this.stopPrev(true)
    } else {
      this.stopPrev()
    }
  }
  var hook = require(`${LIGHT_SOURCE}loading.js`)
  var context = this.getContext()
  this.prev = hook(context, {
    degree: this.degree || 0
  }, function noop () {})
}

Light.prototype.setStandby = function () {
  this.stopPrev()
  var hook = require(`${LIGHT_SOURCE}setStandby.js`)
  var context = this.getContext()
  this.prev = hook(context, {}, function noop () {})
}

Light.prototype.setVolume = function (volume) {
  if (this.prev) {
    if (typeof this.prev === 'object' && this.prev.name === 'setVolume') {
      this.stopPrev(true)
    } else {
      this.stopPrev()
    }
  }
  var hook = require(`${LIGHT_SOURCE}setVolume.js`)
  var context = this.getContext()
  this.prev = hook(context, {
    volume: +volume
  }, function noop () {})
  this.prev.name = 'setVolume'
}

Light.prototype.setWelcome = function () {
  this.stopPrev()
  var hook = require(`${LIGHT_SOURCE}setWelcome.js`)
  var context = this.getContext()
  this.prev = hook(context, {}, function noop () {})
}

Light.prototype.appSound = function (appId, name) {
  if (this.playerHandle[appId]) {
    try {
      // if the frequency is too fast, an error will occur.
      this.playerHandle[appId].stop()
      delete this.playerHandle[appId]
    } catch (error) {
      // if the previous one did not stop, ignore this time
      logger.log(`ignore request: appId [${appId}] sound: [${name}]`)
      return false
    }
  }
  var player
  try {
    player = this.options.effect.sound(name)
    // free the player handle after playbackcomplete or error event
    player.on('playbackcomplete', () => {
      logger.log(`playbackcomplete ${name}`)
      this.playerHandle[appId].stop()
      delete this.playerHandle[appId]
    })
    player.on('error', () => {
      logger.log(`error ${name}`)
      this.playerHandle[appId].stop()
      delete this.playerHandle[appId]
    })

    this.playerHandle[appId] = player
  } catch (error) {
    logger.error(error)
    logger.log(`appSound play error: ${appId} [${name}]`)
    return false
  }
  return true
}

Light.prototype.setPickup = function (duration, callback) {
  this.stopPrev()
  var hook = require(`${LIGHT_SOURCE}setPickup.js`)
  var context = this.getContext()
  this.prev = hook(context, {
    duration: duration,
    degree: this.degree
  }, callback)
}

Light.prototype.setSpeaking = function () {
  this.stopPrev(true)
  var context = this.getContext()
  this.prev = setSpeaking(context, {}, function noop () {})
}

module.exports = Light

function dedup (callback) {
  var called = false
  return function dedupCallback () {
    if (!called) {
      called = true
      return callback.apply(this, arguments)
    }
  }
}
