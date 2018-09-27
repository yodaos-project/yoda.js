'use strict'

var logger = require('logger')('lightService')
var LightRenderingContextManager = require('./effects')
var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer

var LIGHT_SOURCE = '/opt/light/'
var maxUserspaceLayers = 3
var maxSystemspaceLayers = 100

var setSpeaking = require(`${LIGHT_SOURCE}/setSpeaking.js`)

var manager = new LightRenderingContextManager()

function Light (options) {
  // load system light config
  this.systemspace = {}
  try {
    this.systemspace = require(`${LIGHT_SOURCE}/config.json`)
  } catch (error) {
    logger.log(`load systemspace light config error, use default`)
    logger.error(error)
    this.systemspace = {}
  }
  this.playerHandle = {}
  this.options = options
  this.prevCallback = null
  this.prev = null
  this.prevContext = null
  this.prevZIndex = null
  this.prevUri = null
  this.prevAppId = null
  this.degree = 0
  this.userspaceZIndex = new Array(maxUserspaceLayers)
  this.init()
}

Light.prototype.init = function () {
  // TODO
  var layers = 0
  Object.keys(this.systemspace).forEach((key) => {
    // find max layer
    if (this.systemspace[key] > layers) {
      layers = this.systemspace[key]
    }
  })
  if (layers + 1 > maxSystemspaceLayers) {
    layers = maxSystemspaceLayers
  } else {
    layers = layers + 1
  }
  this.systemspaceZIndex = new Array(layers)
  this.setHide()
}

Light.prototype.getContext = function () {
  var self = this
  var context = manager.getContext()
  this.prevContext = context
  context._getCurrentId = function () {
    if (self.prevContext) {
      return self.prevContext._id
    }
    return -1
  }
  return context
}

Light.prototype.stopPrev = function (keep) {
  if (this.prevCallback) {
    this.prevCallback(false, true)
    this.prevCallback = null
  }
  if (this.prev) {
    if (typeof this.prev === 'function') {
      this.prev(keep)
    } else if (this.prev && typeof this.prev.stop === 'function') {
      this.prev.stop(keep)
    }
    this.prev = null
  }
  this.prevZIndex = null
  this.prevUri = null
  this.prevContext = null
  this.prevAppId = null
}

Light.prototype.loadfile = function (appId, uri, data, callback) {
  var handle
  var zIndex
  var self = this
  try {
    var isSystemUri = this.isSystemURI(uri)
    // format z-index.
    if (isSystemUri) {
      zIndex = this.getSystemZIndexByURI(uri)
      zIndex = zIndex >= maxSystemspaceLayers ? maxSystemspaceLayers - 1 : zIndex
      zIndex = zIndex < 0 ? 0 : zIndex
    } else {
      zIndex = data.zIndex || 0
      zIndex = zIndex >= maxUserspaceLayers ? maxUserspaceLayers - 1 : zIndex
      zIndex = zIndex < 0 ? 0 : zIndex
    }
    var canRender = this.canRender(uri, zIndex)
    if (!canRender) {
      return callback(new Error('permission deny'))
    }
    handle = require(uri)
    this.stopPrev(data && data.keep)
    var context = this.getContext()
    // this function can only be called once
    this.prevCallback = dedup(function () {
      setTimeout(() => {
        self.resume()
      }, 0)
      callback()
    })
    this.prev = handle(context, data || {}, () => {
      setTimeout(() => {
        this.prevCallback()
      }, 0)
    })
    this.prevUri = uri
    this.prevZIndex = zIndex
    this.prevAppId = appId
    if (this.prev && this.prev.shouldResume === true) {
      if (isSystemUri) {
        this.systemspaceZIndex[zIndex] = {
          appId: appId,
          uri: uri,
          data: data || {},
          context: context,
          handle: handle
        }
        logger.log(`set systemspace resume: z-index: ${zIndex} ${uri} ${appId}`)
      } else {
        this.userspaceZIndex[zIndex] = {
          appId: appId,
          uri: uri,
          data: data || {},
          context: context,
          handle: handle
        }
        logger.log(`set userspace resume: z-index: ${zIndex} ${uri} ${appId}`)
      }
      // do not resume light if currently light need resume too
      this.prevCallback = function noop () {}
      callback()
    }
  } catch (error) {
    logger.error(`load effect file error from path: ${uri}`, error)
    callback(error)
  }
}

Light.prototype.resume = function () {
  var resume = null
  var isSystemUri = false
  var zIndex = 0
  // systemspace is always higher than userspace
  for (var j = 0; j < this.systemspaceZIndex.length; j++) {
    if (this.systemspaceZIndex[j]) {
      resume = this.systemspaceZIndex[j]
      isSystemUri = true
      zIndex = j
      // clear z-index
      this.systemspaceZIndex[j] = null
      logger.log(`find systemspace resume: z-index: ${j} ${resume.uri} ${resume.appId}`)
      break
    }
  }
  // then userspace
  if (resume === null) {
    // find which z-index need to resume
    for (var i = this.userspaceZIndex.length - 1; i >= 0; i--) {
      if (this.userspaceZIndex[i]) {
        resume = this.userspaceZIndex[i]
        zIndex = i
        // clear z-index
        this.userspaceZIndex[i] = null
        logger.log(`find userspace resume: z-index: ${i} ${resume.uri} ${resume.appId}`)
        break
      }
    }
  }
  if (resume) {
    try {
      var handle = resume.handle
      var context = resume.context
      this.prevContext = context
      this.mockPlayer(context)

      this.prevCallback = dedup(function () {
        // do nothing now
      })
      var data = Object.assign({}, resume.data, {
        isResumed: true
      })
      logger.log(`try to resume light: z-index: ${zIndex} ${resume.uri}`)
      this.prev = handle(context, data, this.prevCallback)
      if (this.prev && this.prev.shouldResume) {
        this.prevUri = resume.uri
        this.prevZIndex = zIndex
        this.prevAppId = resume.appId
        if (isSystemUri) {
          this.systemspaceZIndex[zIndex] = resume
          logger.log(`set systemspace resume: z-index: ${zIndex} ${resume.uri} ${resume.appId}`)
        } else {
          this.userspaceZIndex[zIndex] = resume
          logger.log(`set userspace resume: z-index: ${zIndex} ${resume.uri} ${resume.appId}`)
        }
      }
    } catch (error) {
      logger.error(`try to resume effect file error from path: ${resume.uri}`, error)
    }
  }
}

/**
 * return whether have permission to render
 * @param {string} uri light uri
 * @param {number} zIndex to identify the z-index of light
 * @returns {boolean} true if can render
 */
Light.prototype.canRender = function (uri, zIndex) {
  // is there any light rendering at present
  if (this.prev && this.prevUri) {
    var isPrevSystemUri = this.isSystemURI(this.prevUri)
    var isSystemUri = this.isSystemURI(uri)
    // systemspace is always higher than userspace
    if (isSystemUri && !isPrevSystemUri) {
      return true
    }
    if (isSystemUri && isPrevSystemUri) {
      // the smaller the number, the higher the priority
      return this.getSystemZIndexByURI(uri) <= this.prevZIndex
    }
    // the larger the number, the higher the number of layers
    return zIndex >= this.prevZIndex
  }
  return true
}

/**
 * return whether uri is belong to systemspace
 * @param {string} uri light uri
 * @returns {boolean} true if belong to systemspace
 */
Light.prototype.isSystemURI = function (uri) {
  var len = LIGHT_SOURCE.length
  var key = uri.substr(len)
  if (this.systemspace[key] !== undefined) {
    return true
  }
  return false
}

Light.prototype.getSystemZIndexByURI = function (uri) {
  var len = LIGHT_SOURCE.length
  var key = uri.substr(len)
  if (this.systemspace[key] !== undefined) {
    return +this.systemspace[key]
  }
  // return default z-index
  return maxSystemspaceLayers
}

Light.prototype.mockPlayer = function (context) {
  var mockPlayer = {
    stop: function () {
      // nothing to do
    }
  }
  context.sound = function () {
    return mockPlayer
  }
}

Light.prototype.stopFile = function (appId, uri) {
  var isFind = false
  // systemspace is always higher than userspace
  for (var j = 0; j < this.systemspaceZIndex.length; j++) {
    if (this.systemspaceZIndex[j] && this.systemspaceZIndex[j].uri === uri &&
        this.prevAppId === appId) {
      // clear z-index
      this.systemspaceZIndex[j] = null
      logger.log('clear systemspace layers')
      isFind = true
      break
    }
  }
  // then userspace
  if (!isFind) {
    // find which z-index need to resume
    for (var i = this.userspaceZIndex.length - 1; i >= 0; i--) {
      if (this.userspaceZIndex[i] && this.userspaceZIndex[i].uri === uri &&
          this.prevAppId === appId) {
        // clear z-index
        this.userspaceZIndex[i] = null
        logger.log('clear userspace layers')
        break
      }
    }
  }
  // stop light if currently is rendering
  if (this.prev && this.prevUri === uri) {
    logger.log(`stop resume light: ${uri}`)
    this.stopPrev()
  }
  // try to resume next layer
  this.resume()
}

Light.prototype.setAwake = function (appId) {
  var uri = '/opt/light/awake.js'
  var canRender = this.canRender(uri, 2)
  this.loadfile(appId, uri, {}, function noop () {})
  if (canRender && this.prev) {
    this.prev.name = 'setAwake'
  }
}

Light.prototype.setDegree = function (appId, degree) {
  var uri = '/opt/light/awake.js'
  if (this.prev && this.prev.name === 'setAwake') {
    this.degree = +degree
    this.loadfile(appId, uri, {
      degree: this.degree
    }, function noop () {})
  }
}

Light.prototype.setHide = function () {
  logger.log('set hide')
  this.stopPrev()
  if (this.prevContext) {
    this.prevContext.stop()
    this.prevContext.clear()
    this.prevContext.render()
  }
}

Light.prototype.setLoading = function (appId) {
  logger.log('set loading')
  var uri = `${LIGHT_SOURCE}/loading.js`
  this.loadfile(appId, uri, {}, function noop () {})
}

Light.prototype.setStandby = function () {
  this.stopPrev()
  var hook = require(`${LIGHT_SOURCE}/setStandby.js`)
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
  var hook = require(`${LIGHT_SOURCE}/setVolume.js`)
  var context = this.getContext()
  this.prev = hook(context, {
    volume: +volume
  }, function noop () {})
  this.prev.name = 'setVolume'
}

Light.prototype.setWelcome = function () {
  this.stopPrev()
  var hook = require(`${LIGHT_SOURCE}/setWelcome.js`)
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
    player = new MediaPlayer(AudioManager.STREAM_SYSTEM)
    player.start(name)
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

Light.prototype.setPickup = function (appId, duration) {
  var uri = `${LIGHT_SOURCE}/setPickup.js`
  this.loadfile(appId, uri, {
    degree: this.degree,
    duration: +duration
  }, function noop () {})
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
