'use strict'

var logger = require('logger')('lightService')
var LightRenderingContextManager = require('./effects')
var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer

var LIGHT_SOURCE = '/opt/light/'
var maxUserspaceLayers = 3
var maxSystemspaceLayers = 100

var manager = new LightRenderingContextManager()

function Light () {
  // load system light config
  this.systemspace = {}
  try {
    this.systemspace = require(`${LIGHT_SOURCE}config.json`)
  } catch (error) {
    logger.log(`load systemspace light config error, use default`)
    logger.error(error)
    this.systemspace = {}
  }
  this.playerHandle = {}
  this.prevCallback = null
  this.prev = null
  this.prevContext = null
  this.prevZIndex = null
  this.prevUri = null
  this.prevAppId = null
  this.nextResumeTimer = null
  this.degree = 0
  this.uriHandlers = {}
  this.userspaceZIndex = new Array(maxUserspaceLayers)
  this.init()
}

Light.prototype.init = function () {
  // load awake uri by default
  var awakeURI = '/opt/light/awake.js'
  this.uriHandlers[awakeURI] = require(awakeURI)
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

/**
 * stop currently light
 * @param {boolean} keepLastFrame whether to keep the last frame of currently light
 */
Light.prototype.stopPrev = function (keepLastFrame) {
  if (typeof this.prevCallback === 'function') {
    this.prevCallback()
    this.prevCallback = null
  }
  if (this.prev) {
    try {
      if (typeof this.prev === 'function') {
        this.prev(keepLastFrame)
      } else if (this.prev && typeof this.prev.stop === 'function') {
        this.prev.stop(keepLastFrame)
      }
    } catch (error) {
      logger.error(`try to stop '${this.prevUri}' error. belong to '${this.prevAppId}'`)
    }
    this.prev = null
  }
  // auto free timer and clear light. users should not call this method manually.
  // this is also to achieve smooth transition
  if (this.prevContext) {
    this.prevContext.stop(keepLastFrame)
  }
  this.prevZIndex = null
  this.prevUri = null
  this.prevContext = null
  this.prevAppId = null
}

Light.prototype.clearPrev = function () {
  this.prev = null
  this.prevZIndex = null
  this.prevUri = null
  this.prevContext = null
  this.prevAppId = null
  this.prevCallback = null
}

Light.prototype.loadfile = function (appId, uri, data, option, callback) {
  var zIndex
  var self = this
  try {
    logger.info('request light uri:', appId, uri, data, option)
    var isSystemUri = this.isSystemURI(uri)
    // format z-index.
    if (isSystemUri) {
      zIndex = this.getSystemZIndexByURI(uri)
      zIndex = zIndex >= maxSystemspaceLayers ? maxSystemspaceLayers - 1 : zIndex
      zIndex = zIndex < 0 ? 0 : zIndex
    } else {
      zIndex = option.zIndex || 0
      zIndex = zIndex >= maxUserspaceLayers ? maxUserspaceLayers - 1 : zIndex
      zIndex = zIndex < 0 ? 0 : zIndex
    }
    // update layers by uri
    if (!option.shouldResume) {
      this.removeLayerByUri(uri)
    }
    var canRender = this.canRender(uri, zIndex)
    if (!canRender) {
      logger.warn(`${appId} request light ${uri} can not render, because currently ZIndex is: ${this.prevZIndex || 'null'} ${this.prevUri}`)
      // push into resume layers
      if (option.shouldResume === true) {
        this.setResume(appId, isSystemUri, zIndex, uri, data)
      }
      return callback()
    }

    // FIXME: delete handlers that are not used for a long time
    logger.info(`start require uri ${uri}`)
    var handle = this.uriHandlers[uri]
    if (handle === undefined) {
      handle = this.uriHandlers[uri] = require(uri)
    }
    logger.log('call stopPrev loadfile')
    // smooth transition to next light
    this.stopPrev(true)
    var context = this.getContext()
    // handle this light request first, then restore the light
    clearTimeout(self.nextResumeTimer)
    if (option.shouldResume === true) {
      // do not resume light if currently light need resume too
      this.prevCallback = function noop () {
        logger.warn(`light ${uri} should not call callback because it will resume`)
      }
      callback()
    } else {
      // this function can only be called once
      this.prevCallback = dedup(() => {
        // resume the light after no light request
        this.nextResumeTimer = setTimeout(() => {
          // this.clearPrev()
          this.resume()
        }, 0)
        callback()
      })
    }
    if (option.shouldResume === true) {
      this.setResume(appId, isSystemUri, zIndex, uri, data, context)
    }
    this.prev = handle(context, data || {}, () => {
      setTimeout(() => {
        this.prevCallback && this.prevCallback()
      }, 0)
    })
    this.prevUri = uri
    this.prevZIndex = zIndex
    this.prevAppId = appId
  } catch (error) {
    logger.error(`load effect file error from path: ${uri}`, error)
    callback(error)
  }
}

Light.prototype.setResume = function (appId, isSystemUri, zIndex, uri, data, context) {
  var handle = null
  try {
    handle = require(uri)
  } catch (error) {
    logger.error(`appId: ${appId} set resume error when load file from: ${uri}`)
    handle = null
    return
  }
  if (isSystemUri) {
    this.systemspaceZIndex[zIndex] = {
      appId: appId,
      uri: uri,
      data: data || {},
      context: context,
      handle: handle
    }
    logger.log(`set systemspace resume: appId: ${appId} z-index: ${zIndex} uri: ${uri}`)
  } else {
    this.userspaceZIndex[zIndex] = {
      appId: appId,
      uri: uri,
      data: data || {},
      context: context,
      handle: handle
    }
    logger.log(`set userspace resume: appId: ${appId} z-index: ${zIndex} uri: ${uri}`)
  }
}

Light.prototype.removeLayerByUri = function (uri) {
  var removed = false
  for (var i = 0; i < this.systemspaceZIndex.length; i++) {
    if (this.systemspaceZIndex[i] && this.systemspaceZIndex[i].uri === uri) {
      removed = true
      this.systemspaceZIndex[i] = null
      logger.log(`clear systemspace ${uri} because it was update`)
      break
    }
  }
  if (removed) {
    return removed
  }

  for (var j = 0; j < this.userspaceZIndex.length; j++) {
    if (this.userspaceZIndex[i] && this.userspaceZIndex[i].uri === uri) {
      removed = true
      this.userspaceZIndex[i] = null
      logger.log(`clear userspace ${uri} because it was update`)
      break
    }
  }
  return removed
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
      logger.log('call stopPrev resume')
      // for smooth transition
      this.stopPrev(true)

      var handle = resume.handle
      var context
      // create a new context for light, because it is no old context
      if (!resume.context) {
        context = this.getContext()
        resume.context = context
      } else {
        context = resume.context
      }
      this.prevContext = context
      this.mockPlayer(context)

      this.prevCallback = dedup(function () {
        // do nothing now
      })
      var data = Object.assign({}, resume.data, {
        isResumed: true
      })
      logger.log(`try to resume light: appId: ${resume.appId} z-index: ${zIndex} uri: ${resume.uri}`)
      this.prev = handle(context, data, this.prevCallback)
      this.prevUri = resume.uri
      this.prevZIndex = zIndex
      this.prevAppId = resume.appId
      // set resume light
      if (this.prev && this.prev.shouldResume) {
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
  } else {
    // clear leds effect without next light to render
    this.stopPrev(false)
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
  if (this.prevUri) {
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

/**
 *
 * @param {string} appId -
 * @param {string} [uri] - stop given light resource, if not specified, stop all light bound to the app
 */
Light.prototype.stopFile = function (appId, uri) {
  var isFind = false
  // systemspace is always higher than userspace
  for (var j = 0; j < this.systemspaceZIndex.length; j++) {
    if (this.systemspaceZIndex[j] == null) {
      continue
    }
    if (appId !== this.systemspaceZIndex[j].appId) {
      continue
    }
    // clear z-index
    this.systemspaceZIndex[j] = null
    logger.log(`${appId} [${j}]['${this.systemspaceZIndex[j].uri}'] clears systemspace layer`)
    isFind = true
    // no more layer need to clear if when give a specific uri
    if (uri) {
      break
    }
  }
  // then userspace
  if (!isFind) {
    // find which z-index need to resume
    for (var i = this.userspaceZIndex.length - 1; i >= 0; i--) {
      if (this.userspaceZIndex[i] == null) {
        continue
      }
      if (appId !== this.userspaceZIndex[i].appId) {
        continue
      }
      // clear z-index
      this.userspaceZIndex[i] = null
      logger.log(`${appId} [${i}]['${this.userspaceZIndex[i].uri}'] clear userspace layer`)
      // no more layer need to clear if when give a specific uri
      if (uri) {
        break
      }
    }
  }
  // stop light if currently is rendering
  if (this.prevUri && this.prevAppId === appId) {
    if (!uri || this.prevUri === uri) {
      logger.log(`stop currently light: ${appId} ${uri}`)
      // try to resume next layer
      logger.log('try to find need resume light')
      this.resume()
    }
  }
}

Light.prototype.setAwake = function (appId) {
  var uri = '/opt/light/awake.js'
  this.loadfile(appId, uri, {}, {}, function noop (error) {
    if (error) {
      logger.error('setAwake error', error)
    } else {
      logger.log('setAwake complete')
    }
  })
}

Light.prototype.setDegree = function (appId, degree) {
  var uri = '/opt/light/awake.js'
  if (this.prevUri && this.prevUri === uri) {
    this.degree = +degree
    this.loadfile(appId, uri, {
      degree: this.degree
    }, {}, function noop (error) {
      if (error) {
        logger.error('setDegree error', error)
      } else {
        logger.log('setDegree complete')
      }
    })
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
  var uri = `${LIGHT_SOURCE}loading.js`
  this.loadfile(appId, uri, {}, {}, function noop (error) {
    if (error) {
      logger.error('setLoading error', error)
    } else {
      logger.log('setLoading complete')
    }
  })
}

Light.prototype.appSound = function (appId, name, cb) {
  if (this.playerHandle[appId]) {
    try {
      // if the frequency is too fast, an error will occur.
      this.playerHandle[appId].stop()
      delete this.playerHandle[appId]
    } catch (error) {
      // if the previous one did not stop, ignore this time
      logger.log(`ignore request: appId [${appId}] sound: [${name}]`)
      cb(new Error('ignore request because can not stop previous player'))
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
      cb()
    })
    player.on('error', () => {
      logger.log(`error ${name}`)
      this.playerHandle[appId].stop()
      delete this.playerHandle[appId]
      cb(new Error('player throw an error'))
    })

    this.playerHandle[appId] = player
  } catch (error) {
    cb(error)
    logger.error(error)
    logger.log(`appSound play error: ${appId} [${name}]`)
    return false
  }
  return true
}

Light.prototype.setPickup = function (appId, duration, withAwaken) {
  var uri = `${LIGHT_SOURCE}setPickup.js`
  this.loadfile(appId, uri, {
    degree: this.degree,
    duration: +duration,
    withAwaken: withAwaken
  }, {}, function noop (error) {
    if (error) {
      logger.error('setPickup error', error)
    } else {
      logger.log('setPickup complete')
    }
  })
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
