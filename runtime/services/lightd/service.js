'use strict'

var logger = require('logger')('lightService')
var LightRenderingContextManager = require('./effects')
var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var helper = require('./helper')

var LIGHT_SOURCE = '/opt/light/'
var maxUserspaceLayers = 3
var maxSystemspaceLayers = 100

function Light () {
  this.manager = new LightRenderingContextManager()
  // load system light config
  this.systemspace = {}
  try {
    this.systemspace = require(`${LIGHT_SOURCE}config.json`)
  } catch (error) {
    logger.log(`load systemspace light config error, use default`)
    logger.error(error)
    this.systemspace = {}
  }
  this.playerHandle = null
  this.playerAppId = null

  this.prevCallback = null
  this.prev = null
  this.prevContext = null
  this.prevZIndex = null
  this.prevUri = null
  this.prevAppId = null
  this.nextResumeTimer = null
  this.degree = 0
  this.uriHandlers = {}
  this.init()
}

Light.prototype.init = function () {
  // load awake uri by default
  var awakeURI = '/opt/light/awake.js'
  this.uriHandlers[awakeURI] = require(awakeURI)

  this.reset()
}

Light.prototype.getContext = function () {
  var self = this
  var context = this.manager.getContext()
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
    logger.log('call function: prevCallback')
    this.prevCallback()
    this.prevCallback = null
  }
  if (this.prev) {
    try {
      if (typeof this.prev === 'function') {
        logger.log('call hook function: stop')
        this.prev(keepLastFrame)
      } else if (this.prev && typeof this.prev.stop === 'function') {
        logger.log('call hook function: prev.stop')
        this.prev.stop(keepLastFrame)
      } else {
        logger.log('ignore stop hook because currently light didn\'t subscribe it')
      }
    } catch (error) {
      logger.error(`try to call hook: stop '${this.prevUri}' error. belong to '${this.prevAppId}'`)
    }
    this.prev = null
  }
  // auto free timer and clear light. users should not call this method manually.
  // this is also to achieve smooth transition
  if (this.prevContext) {
    logger.log('clear all timer and player')
    this.prevContext.stop(keepLastFrame)
  } else {
    logger.warn('currently not found context light, skip clear timer and player')
  }
  // turn off LED if keepLastFrame not specified as true
  if (keepLastFrame !== true) {
    this.manager.clearLight()
  }
  this.prevZIndex = null
  this.prevUri = null
  this.prevContext = null
  this.prevAppId = null
  logger.log(`stop currently light complete with keepLastFrame: [${keepLastFrame}]`)
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
      logger.log(`The light of URI: [${uri}] is belong to systemspace`)
    } else {
      zIndex = option.zIndex || 0
      zIndex = zIndex >= maxUserspaceLayers ? maxUserspaceLayers - 1 : zIndex
      zIndex = zIndex < 0 ? 0 : zIndex
      logger.log(`The light of URI: [${uri}] is belong to userspace`)
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
      if (callback) {
        callback()
      }
      return false
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
      if (callback) {
        callback()
      }
    } else {
      // this function can only be called once
      this.prevCallback = dedup(() => {
        // resume the light after no light request
        this.nextResumeTimer = setTimeout(() => {
          // this.clearPrev()
          this.resume()
        }, 0)
        if (callback) {
          callback()
        }
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
    return true
  } catch (error) {
    logger.error(`load effect file error from path: ${uri}`, error)
    if (callback) {
      callback(error)
    }
    return false
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
      if (isSystemUri) {
        this.systemspaceZIndex[zIndex] = resume
        logger.log(`set systemspace resume: z-index: ${zIndex} ${resume.uri} ${resume.appId}`)
      } else {
        this.userspaceZIndex[zIndex] = resume
        logger.log(`set userspace resume: z-index: ${zIndex} ${resume.uri} ${resume.appId}`)
      }
    } catch (error) {
      logger.error(`try to resume effect file error from path: ${resume.uri}`, error)
    }
  } else {
    logger.log('no light need to resume, turn off LED')
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
    // systemspace is always higher than userspace
    if (!isSystemUri && isPrevSystemUri) {
      return false
    }
    if (isSystemUri && isPrevSystemUri) {
      // the smaller the number, the higher the priority
      return this.getSystemZIndexByURI(uri) <= this.prevZIndex
    }
    if (!isSystemUri && !isPrevSystemUri) {
      // the larger the number, the higher the number of layers
      return zIndex >= this.prevZIndex
    }
  }
  // systemspace is always higher than userspace
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
    if (uri && uri !== this.systemspaceZIndex[j].uri) {
      continue
    }
    // clear z-index
    logger.log(`${appId} [${j}]['${this.systemspaceZIndex[j].uri}'] clears systemspace layer`)
    this.systemspaceZIndex[j] = null
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
      if (uri && uri !== this.userspaceZIndex[i].uri) {
        continue
      }
      // clear z-index
      logger.log(`${appId} [${i}]['${this.userspaceZIndex[i].uri}'] clear userspace layer`)
      this.userspaceZIndex[i] = null
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

Light.prototype.reset = function () {
  logger.warn('RESET Lightd. This action will reset the service to the initialization state.')
  var Maxlayer = helper.getMaxLayer(this.systemspace, maxSystemspaceLayers)
  this.systemspaceZIndex = new Array(Maxlayer)
  this.userspaceZIndex = new Array(maxUserspaceLayers)
  this.stopPrev(false)
}

Light.prototype.appSound = function (appId, name, cb) {
  var isSuccess = this.stopPrevSound()
  if (!isSuccess) {
    logger.error(`ignore request: appId [${appId}] sound: [${name}] because can not stop previous player.`)
    cb(new Error('ignore request because can not stop previous player'))
    return false
  }

  var player
  try {
    player = new MediaPlayer(AudioManager.STREAM_SYSTEM)
    player.start(name)
    // free the player handle after playbackcomplete or error event
    player.on('playbackcomplete', () => {
      logger.log(`playbackcomplete: [${appId}] [${name}]`)
      this.stopPrevSound()
      cb()
    })
    player.on('cancel', () => {
      logger.log(`player cancel: [${appId}] [${name}]`)
      cb()
    })
    player.on('error', () => {
      logger.error(`player error: [${appId}] [${name}]`)
      this.stopPrevSound()
      cb(new Error('player throw an error'))
    })

    this.playerHandle = player
    this.playerAppId = appId
  } catch (err) {
    cb(err)
    logger.error(`appSound play error: [${appId}] [${name}] err: ${err.message}`)
    return false
  }
  return true
}

Light.prototype.stopSoundByAppId = function (appId) {
  if (!this.playerHandle) {
    logger.log(`[${appId}] no sound currently playing`)
    return
  }
  if (this.playerAppId !== appId) {
    logger.warn(`[${appId}] currently sound belong to appId: [${this.playerAppId}], not yours!`)
    return
  }
  var isSuccess = this.stopPrevSound()
  if (isSuccess) {
    logger.log(`[${appId}] stop previous sound success`)
  } else {
    logger.error(`[${appId}] stop previous sound error`)
  }
}

/**
 * stop currently sound
 */
Light.prototype.stopPrevSound = function () {
  if (this.playerHandle) {
    try {
      // if the frequency is too fast, an error will occur.
      this.playerHandle.stop()
      this.playerHandle = null
      this.playerAppId = null
    } catch (err) {
      // if the previous one did not stop, ignore this time
      logger.error(`try to stop currently sound error: [${this.playerAppId}] err: ${err.message}`)
      return false
    }
  }
  return true
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
