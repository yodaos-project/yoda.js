'use strict'

var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var light = require('@yoda/light')
var LRU = require('lru-cache')
var Map = require('pseudomap')
var logger = require('logger')('effects')

var SYSTEM_MEDIA_SOURCE = '/opt/media/'

var PLAYERCACHE = new LRU({
  max: 1,
  dispose: (key, val) => {
    try {
      val._stop()
    } catch (error) {
      logger.log(`PlayerCache: try to stop ${key} error`)
    }
  }
})
var SYSTEMCACHE = new Map()

module.exports = LightRenderingContextManager

/**
 * manager lightRendering context
 */
function LightRenderingContextManager () {
  this.id = 0
}

/**
 * create a new lightRendering context
 * @returns {LightRenderingContext} a LightRenderingContext instance
 */
LightRenderingContextManager.prototype.getContext = function () {
  var context = new LightRenderingContext()
  context._id = this.id++
  return context
}

/**
 * lightRendering context
 */
function LightRenderingContext () {
  this._id = -1
  this._handleId = 0
  this._handle = {}

  this.ledsConfig = light.getProfile()
}

/**
 * get the id being rendered
 */
LightRenderingContext.prototype._getCurrentId = function () {
  return -1
}

/**
 * play sound
 * @param {String} uri - the sound resource uri
 * @param {String} [self] - as prefix path if uri start with 'self://' protocol
 * @returns {MediaPlayer} a MediaPlayer instance
 */
LightRenderingContext.prototype.sound = function (uri, self) {
  if (this._getCurrentId() !== this._id) {
    return
  }
  var isSystem = false
  var len = uri.length
  var absPath = ''
  if (len > 9 && uri.substr(0, 9) === 'system://') {
    // etc.. system://path/to/sound.ogg
    absPath = SYSTEM_MEDIA_SOURCE + uri.substr(9)
    isSystem = true
  } else if (len > 7 && uri.substr(0, 7) === 'self://') {
    // etc.. self://path/to/sound.ogg
    absPath = self + '/' + uri.substr(7)
  } else {
    // etc.. /path/to/sound.ogg
    absPath = uri
  }
  var cache = PLAYERCACHE
  if (isSystem) {
    cache = SYSTEMCACHE
  }

  var sounder = cache.get(absPath)
  if (sounder != null) {
    sounder.seek(0)
    sounder.resume()
  } else {
    sounder = new MediaPlayer(AudioManager.STREAM_SYSTEM)
    sounder.start(absPath)
    PLAYERCACHE.set(absPath, sounder)
  }

  sounder._stop = sounder.stop
  sounder.stop = function stop () {
    try {
      sounder.pause()
    } catch (error) {
      logger.log(`try to pause ${absPath} error`)
    }
  }

  return sounder
}

/**
 * clear all timer and clear last frame
 * @param {Boolean} keep - if keep is true will not clear the last frame
 */
LightRenderingContext.prototype.stop = function (keep) {
  for (var i in this._handle) {
    clearTimeout(this._handle[i])
  }
  if (this._getCurrentId() !== this._id) {
    return
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
  if (this._getCurrentId() !== this._id) {
    return
  }
  return light.write()
}

/**
 * clear the effects buffer.
 */
LightRenderingContext.prototype.clear = function () {
  if (this._getCurrentId() !== this._id) {
    return
  }
  return light.clear()
}

/**
 * write a single pixel.
 * @param {Number} pos - the position of the pixel to be written
 * @param {Number} r - Red value. from 0 to 255
 * @param {Number} g - Green value. from 0 to 255
 * @param {Number} b - Red value. from 0 to 255
 * @param {Number} a - Transparency value. from 0 to 1
 *
 */
LightRenderingContext.prototype.pixel = function (pos, r, g, b, a) {
  if (this._getCurrentId() !== this._id) {
    return
  }
  return light.pixel(pos, r, g, b, a)
}

/**
 * fill all pixels to the specified color
 * @param {Number} r - Red value. from 0 to 255
 * @param {Number} g - Green value. from 0 to 255
 * @param {Number} b - Red value. from 0 to 255
 * @param {Number} a - Transparency value. from 0 to 1
 */
LightRenderingContext.prototype.fill = function (r, g, b, a) {
  if (this._getCurrentId() !== this._id) {
    return
  }
  return light.fill(r, g, b, a)
}

/**
 * Perform callback after the specified time
 * @param {Function} cb - callback
 * @param {Number} interval - millisecond
 */
LightRenderingContext.prototype.requestAnimationFrame = function (cb, interval) {
  if (this._getCurrentId() !== this._id) {
    return
  }
  var handle = this._handleId++
  this._handle[handle] = setTimeout(() => {
    clearTimeout(this._handle[handle])
    delete this._handle[handle]
    cb()
  }, interval)
}

/**
 * make a transition. the fourth parameter will be true in callback when transition end
 * @param {yodaRT.Color} from - Specify the starting color of the transition
 * @param {yodaRT.Color} to - Specify the end color of the transition
 * @param {Number} duration - Specify the duration of the transition
 * @param {Number} fps - Specify the fps of the transition
 * @param {Function} cb - a function to receive rgb color in transitions
 */
LightRenderingContext.prototype.transition = function (from, to, duration, fps, cb) {
  if (this._getCurrentId() !== this._id) {
    return
  }
  var self = this
  // transform fps to the number of frame
  fps = Math.ceil(duration * fps / 1000)
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

/**
 * make a breathing effect. the fourth parameter will be true in callback when breathing end
 * @param {Number} r - Red value of the breathing effect
 * @param {Number} g - Green value of the breathing effect
 * @param {Number} b - Blue value of the breathing effect
 * @param {Number} duration - Specify the duration of the transition
 * @param {Number} fps - Specify the fps of the transition
 * @param {Function} cb - a function to receive rgb color in breathing
 */
LightRenderingContext.prototype.breathing = function (r, g, b, duration, fps, cb) {
  if (this._getCurrentId() !== this._id) {
    return
  }
  var self = this
  // transform fps to the number of frame
  fps = Math.ceil(duration * fps / 1000 / 2)
  var transformed = false
  var times = Math.floor(duration / fps / 2)
  var stepR = r / fps
  var stepG = g / fps
  var stepB = b / fps
  stepR = (stepR === 0 && r > 0) ? 1 : stepR
  stepG = (stepG === 0 && g > 0) ? 1 : stepG
  stepB = (stepB === 0 && b > 0) ? 1 : stepB
  var colorR = 0
  var colorG = 0
  var colorB = 0
  var left = fps * 2
  var render = function (red, green, blue) {
    left--
    if (left <= 0) {
      cb && cb(red, green, blue, true)
      return
    } else {
      cb && cb(red, green, blue, false)
    }
    colorR += stepR
    colorG += stepG
    colorB += stepB
    if (stepR > 0) {
      colorR = colorR > r ? r : colorR
    } else {
      colorR = colorR < 0 ? 0 : colorR
    }
    if (stepG > 0) {
      colorG = colorG > g ? g : colorG
    } else {
      colorG = colorG < 0 ? 0 : colorG
    }
    if (stepB > 0) {
      colorB = colorB > b ? b : colorB
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
