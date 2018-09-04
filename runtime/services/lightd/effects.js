'use strict'

var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var light = require('@yoda/light')
var LRU = require('lru-cache')
var Map = require('pseudomap')

var SYSTEM_MEDIA_SOURCE = '/opt/media/'

/**
 * @typedef Color
 * @memberof yodaRT
 * @property {Number} r - the red channel.
 * @property {Number} g - the green channel.
 * @property {Number} b - the blue channel.
 */

/**
 * The instance of `LightRenderingContext` is used for customizing your
 * light effects. The following are a loading source code:
 *
 * ```js
 * module.exports = function loading (context, params, callback) {
 *   var pos = 0
 *   if (data.degree) {
 *     pos = Math.floor((data.degree / 360) * light.ledsConfig.leds)
 *   }
 *   render()
 *   light.requestAnimationFrame(() => {
 *     light.stop()
 *   }, 6000)
 *
 *   function render () {
 *     light.fill(30, 30, 150)
 *     pos = pos === 11 ? 0 : pos + 1
 *     light.pixel(pos, 255, 255, 255)
 *     light.render()
 *     light.requestAnimationFrame(render, 60)
 *   }
 *   return {
 *     stop: function () {
 *       light.stop()
 *     }
 *   }
 * }
 * ```
 * @memberof yodaRT
 * @class
 */
function LightRenderingContext () {
  this.id = 0
  this.handle = {}
  this.ledsConfig = light.getProfile()
  this._wakeupPlayer = new MediaPlayer(AudioManager.STREAM_AUDIO)
  this._playerCache = new LRU({
    max: 10,
    dispose: (key, val) => {
      val._stop()
    }
  })
  this._systemCache = new Map()
}

/**
 * play sound
 * @param {String} uri - the sound resource uri
 */
LightRenderingContext.prototype.sound = function (name, self) {
  var isSystem = false
  var len = name.length
  var absPath = ''
  if (len > 9 && name.substr(0, 9) === 'system://') {
    // etc.. system://path/to/sound.ogg
    absPath = SYSTEM_MEDIA_SOURCE + name.substr(9)
    isSystem = true
  } else if (len > 7 && name.substr(0, 7) === 'self://') {
    // etc.. self://path/to/sound.ogg
    absPath = self + '/' + name.substr(7)
  } else {
    // etc.. path/to/sound.ogg
    absPath = name
  }
  var cache = this._playerCache
  if (isSystem) {
    cache = this._systemCache
  }

  var sounder = cache.get(absPath)
  if (sounder != null) {
    sounder.seek(0)
    sounder.resume()
  } else {
    sounder = new MediaPlayer(AudioManager.STREAM_AUDIO)
    sounder.start(absPath)
    this._playerCache.set(absPath, sounder)
  }

  sounder._stop = sounder.stop
  sounder.stop = sounder.pause.bind(sounder)

  return sounder
}

/**
 * request an animation frame, this will call the function `cb` after `interval`.
 */
LightRenderingContext.prototype.requestAnimationFrame = function (cb, interval) {
  var handle = this.id++
  this.handle[handle] = setTimeout(() => {
    clearTimeout(this.handle[handle])
    delete this.handle[handle]
    cb()
  }, interval)
}

/**
 * stop the effect
 */
LightRenderingContext.prototype.stop = function (keep) {
  for (var i in this.handle) {
    clearTimeout(this.handle[i])
  }
  if (keep !== true) {
    this.clear()
    this.render()
  }
}

/**
 * render the effect.
 */
LightRenderingContext.prototype.render = function () {
  return light.write()
}

/**
 * clear the effect.
 */
LightRenderingContext.prototype.clear = function () {
  return light.clear()
}

/**
 * write single position.
 */
LightRenderingContext.prototype.pixel = function (pos, r, g, b, a) {
  return light.pixel(pos, r, g, b, a)
}

/**
 * write all lights.
 */
LightRenderingContext.prototype.fill = function (r, g, b, a) {
  return light.fill(r, g, b, a)
}

/**
 * make a breathing effect.
 */
LightRenderingContext.prototype.breathing = function (or, og, ob, duration, fps, cb) {
  var self = this
  var transformed = false
  var times = Math.floor(duration / fps / 2)
  var stepR = or / fps
  var stepG = og / fps
  var stepB = ob / fps
  stepR = (stepR === 0 && or > 0) ? 1 : stepR
  stepG = (stepG === 0 && og > 0) ? 1 : stepG
  stepB = (stepB === 0 && ob > 0) ? 1 : stepB
  var colorR = 0
  var colorG = 0
  var colorB = 0
  var left = fps * 2
  var render = function (r, g, b) {
    left--
    if (left <= 0) {
      cb && cb(r, g, b, true)
      return
    } else {
      cb && cb(r, g, b, false)
    }
    colorR += stepR
    colorG += stepG
    colorB += stepB
    if (stepR > 0) {
      colorR = colorR > or ? or : colorR
    } else {
      colorR = colorR < 0 ? 0 : colorR
    }
    if (stepG > 0) {
      colorG = colorG > og ? og : colorG
    } else {
      colorG = colorG < 0 ? 0 : colorG
    }
    if (stepB > 0) {
      colorB = colorB > ob ? ob : colorB
    } else {
      colorB = colorB < 0 ? 0 : colorB
    }
    if (left <= fps && !transformed) {
      stepR = -stepR
      stepG = -stepG
      stepB = -stepB
      transformed = true
    }
    if (left <= 1) {
      colorR = 0
      colorG = 0
      colorB = 0
    }

    self.requestAnimationFrame(() => {
      render(colorR, colorG, colorB)
    }, times)
  }
  render(colorR, colorG, colorB)
}

/**
 * make a transition.
 * @param {yodaRT.Color} from
 * @param {yodaRT.Color} to
 * @param {Number} duration
 * @param {Number} fps
 * @param {Function} cb
 */
LightRenderingContext.prototype.transition = function (from, to, duration, fps, cb) {
  var self = this
  var times = Math.floor(duration / fps)
  var stepR = (to.r - from.r) / fps
  var stepG = (to.g - from.g) / fps
  var stepB = (to.b - from.b) / fps

  var colorR = from.r
  var colorG = from.g
  var colorB = from.b
  var left = fps
  var render = function (r, g, b) {
    left--
    if (left <= 0) {
      cb && cb(r, g, b, true)
      return
    } else {
      cb && cb(r, g, b, false)
    }
    colorR += stepR
    colorG += stepG
    colorB += stepB
    if (stepR > 0) {
      colorR = colorR > to.r ? to.r : colorR
    } else {
      colorR = colorR < to.r ? to.r : colorR
    }
    if (stepG > 0) {
      colorG = colorG > to.g ? to.g : colorG
    } else {
      colorG = colorG < to.g ? to.g : colorG
    }
    if (stepB > 0) {
      colorB = colorB > to.b ? to.b : colorB
    } else {
      colorB = colorB < to.b ? to.b : colorB
    }

    if (left <= 1) {
      colorR = to.r
      colorG = to.g
      colorB = to.b
    }

    self.requestAnimationFrame(() => {
      render(colorR, colorG, colorB)
    }, times)
  }
  render(colorR, colorG, colorB)
}

module.exports = LightRenderingContext
