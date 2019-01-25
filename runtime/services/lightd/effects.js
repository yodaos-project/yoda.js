'use strict'

/**
 * The LightScript is the script framework which provides you to control
 * any hardware interactive part includes the LEDs and sound effects.
 * Every script just looks like a JavaScript function:
 *
 * ```js
 * module.exports = function (lightCtx, params, done) {
 *   lightCtx.requestAnimationFrame(() => {
 *     lightCtx.fill(255, 255, 255)
 *     lightCtx.render()
 *   })
 * }
 * ```
 *
 * In the main function, LightScript provides the 3 params for script
 * developer:
 *
 * - `lightCtx` {@link yodaRT.light.LightRenderingContext} the LightScript API that you could use.
 * - `params` the object which the caller pass.
 * - `done` the function the developer should call when the light is done.
 *
 * The LightScript files should be installed on `/opt/light` or your `./light` directory
 * under your own application, therefore you could use it by {@link yodaRT.activity.Activity.LightClient}.
 *
 * ```js
 * module.exports = function (activity) {
 *   activity.on('create', () => {
 *     activity.light.play('system://hello.js', { num: 10 }, {
 *       zIndex: 20,
 *       shouldResume: true
 *     })
 *   })
 * }
 * ```
 *
 * The above example application would play the first LightScript after it gets `create` lifetime.
 *
 * @namespace yodaRT.light
 */

var AudioManager = require('@yoda/audio').AudioManager
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var Sounder = require('@yoda/multimedia').Sounder
var property = require('@yoda/property')
var light = require('@yoda/light')
var logger = require('logger')('effects')
var path = require('path')
var EventEmitter = require('events')

var helper = require('./helper')

var SYSTEM_MEDIA_SOURCE = '/opt/media/'

var holdSoundConnect = true
if (property.get('player.sound.holdcon', 'persist') === '0') {
  holdSoundConnect = false
}
var holdAwakeConnect = true
if (property.get('player.lightd.holdcon', 'persist') === '0') {
  holdAwakeConnect = false
}

/**
 * common for context
 */
class Common {
  /**
   * apply alpha factor
   * @param {number} alpha - alpha input
   * @returns {number} - alpha output
   */
  static ApplyAlphaFactor (alpha) {
    if (typeof alpha === 'number' && alpha >= 0 && alpha <= 1) {
      return Common.alphaFactor * alpha
    } else {
      return Common.alphaFactor
    }
  }

  /**
   * set alpha factor
   * @param {number} alpha - alpha factor
   */
  static setAlphaFactor (alpha) {
    Common.alphaFactor = alpha
  }

  /**
   * save the pixel result
   * @param {number} pos - index of led
   * @param {number} r - color.r
   * @param {number} g - color.g
   * @param {number} b - color.b
   * @param {number} a - color.a
   */
  static setPixel (pos, r, g, b, a) {
    if (pos < Common.ledStatus.length - 1) {
      Common.ledStatus[pos].setRGBA(r, g, b, a)
    }
  }

  /**
   * save the fill result
   * @param {number} r - color.r
   * @param {number} g - color.g
   * @param {number} b - color.b
   * @param {number} a - color.a
   */
  static setFill (r, g, b, a) {
    for (var i = 0; i < Common.ledStatus.length; ++i) {
      Common.ledStatus[i].setRGBA(r, g, b, a)
    }
  }

  /**
   * init the led config
   * @param config
   */
  static initLedStatus (config) {
    Common.ledStatus = []
    for (var i = 0; i < config.leds; ++i) {
      Common.ledStatus.push(new Color(0, 0, 0, 1))
    }
  }
}
Common.alphaFactor = 1
Common.ledStatus = []

/**
 * Color class for light
 */
class Color {
  constructor (colorObj) {
    if (typeof colorObj.r === 'number') {
      this.setRGBA(colorObj.r, colorObj.g, colorObj.b, colorObj.a)
    }
  }

  /**
   * set rgba
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @param {number} a
   */
  setRGBA (r, g, b, a) {
    this.r = r
    this.g = g
    this.b = b
    this.a = a
  }
}

module.exports = LightRenderingContextManager

/**
 * @typedef Color
 * @memberof yodaRT.light
 * @property {number} r - the RED color.
 * @property {number} g - the GREEN color.
 * @property {number} b - the BLUE color.
 * @property {number} a - the ALPHA value.
 */

/**
 * @memberof yodaRT.light
 * @class LightRenderingContextManager
 * @classdesc The manager for `LightRenderingContext` objects.
 */
function LightRenderingContextManager () {
  this.id = 0
  this.ledsConfig = light.getProfile()
  Common.initLedStatus(this.ledsConfig)
}

/**
 * Create a new `LightRenderingContext` object.
 * @method getContext
 * @instance
 * @memberof yodaRT.light.LightRenderingContextManager
 * @returns {yodaRT.light.LightRenderingContext}
 */
LightRenderingContextManager.prototype.getContext = function getContext () {
  var context = new LightRenderingContext()
  context._id = this.id++
  return context
}

/**
 * Set the global alpha factor
 * @memberof yodaRT.light.LightRenderingContextManager
 * @method setGlobalAlphaFactor
 * @returns {number} the factor.
 */
LightRenderingContextManager.prototype.setGlobalAlphaFactor = function (alphaFactor) {
  logger.info(`global alpha factor has been set ${alphaFactor}`)
  Common.setAlphaFactor(alphaFactor)
  var context = new LightRenderingContext()
  for (var i = 0; i < Common.ledStatus.length; ++i) {
    context.pixel(i, Common.ledStatus[i].r, Common.ledStatus[i].g, Common.ledStatus[i].b, Common.ledStatus[i].a)
  }
  context.render()
}

/**
 * @memberof yodaRT.light
 * @class LightRenderingContext
 * @classdesc The `LightRenderingContext` object is provided for rendering your
 *            light and sound effects.
 */
function LightRenderingContext () {
  this._id = -1
  this._handleId = 0
  this._handle = {}
  this._soundPlayer = null
  this.ledsConfig = light.getProfile()
}

/**
 * Get the id being rendered.
 * @memberof yodaRT.light.LightRenderingContext
 * @method _getCurrentId
 * @instance
 * @private
 * @returns {number} the rendered id.
 */
LightRenderingContext.prototype._getCurrentId = function () {
  return -1
}

/**
 * Play and monitor the sounds on awaken-time, it plays the system
 * awaken audio ramdonly which are both located at `/opt/light/awake_0x.wav`.
 *
 * @method playAwake
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 */
LightRenderingContext.prototype.playAwake = function playAwake () {
  if (property.get('sys.awakeswitch', 'persist') === 'close') {
    return
  }
  var absPath = `/opt/media/awake_0${Math.floor(Math.random() * 5) + 1}.wav`
  Sounder.play(absPath, AudioManager.STREAM_ALARM, holdAwakeConnect, (err) => {
    if (err) {
      logger.error(`playing ${absPath} occurs error ${err && err.stack}`)
    }
  })
}

/**
 * Play the sound effect by a uri, which is ends with `.wav`, `.ogg` and `.opus`, which means
 * that only supports WAV, OGG and OPUS formats for sound effects.
 *
 * @method sound
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 * @param {string} uri - the sound resource uri.
 * @param {string} [self] - as prefix path if uri start with 'self://' protocol.
 * @param {object} [options] - the options to play the audio.
 * @param {boolean} [options.ignore=false] - ignore this system audio if others(tts, bt, music) are playing.
 * @returns {object} a MediaPlayer instance
 */
LightRenderingContext.prototype.sound = function sound (uri, self, options) {
  options = Object.assign({ ignore: false }, options)
  var mockPlayer = new EventEmitter()
  mockPlayer.stop = function noop () { /** nothing to do */ }

  if (options.ignore && (AudioManager.getPlayingState('tts') ||
    AudioManager.getPlayingState('bluetooth') ||
    AudioManager.getPlayingState('multimedia'))) {
    // nothing to do if currently state is playing
    logger.log('currently state is playing, ignore audio')
    return mockPlayer
  }

  if (this._getCurrentId() !== this._id) {
    return mockPlayer
  }
  var len = uri.length
  var absPath = ''
  if (len > 9 && uri.substr(0, 9) === 'system://') {
    // etc.. system://path/to/sound.ogg
    absPath = SYSTEM_MEDIA_SOURCE + uri.substr(9)
  } else if (len > 7 && uri.substr(0, 7) === 'self://') {
    // etc.. self://path/to/sound.ogg
    absPath = self + '/' + uri.substr(7)
  } else {
    // etc.. /path/to/sound.ogg
    absPath = uri
  }

  if (path.extname(absPath) === '.wav') {
    Sounder.play(absPath, AudioManager.STREAM_SYSTEM, holdSoundConnect, (err) => {
      if (err) {
        logger.error(`playing ${absPath} occurs error ${err && err.stack}`)
      }
    })
    return mockPlayer
  }

  if (this._soundPlayer) {
    this._soundPlayer.stop()
    this._soundPlayer = null
  }

  var sounder = new MediaPlayer(AudioManager.STREAM_SYSTEM)
  sounder.start(absPath)
  helper.delegateEvents(sounder, mockPlayer)

  mockPlayer.stop = function () {
    try {
      sounder.stop()
    } catch (error) {
      logger.error(`unexpected error on stopping sounder(${absPath})`, error.stack)
    }
  }
  this._soundPlayer = mockPlayer
  return mockPlayer
}

/**
 * Clear all handles.
 *
 * @method stop
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 */
LightRenderingContext.prototype.stop = function () {
  for (var i in this._handle) {
    clearTimeout(this._handle[i])
  }
  if (this._soundPlayer) {
    this._soundPlayer.stop()
    this._soundPlayer = null
  }
}

/**
 * Start rendering the current effect.
 *
 * @method render
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 */
LightRenderingContext.prototype.render = function () {
  if (this._getCurrentId() !== this._id) {
    return
  }
  return light.write()
}

/**
 * Clear the effects buffer.
 *
 * @method clear
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 */
LightRenderingContext.prototype.clear = function () {
  if (this._getCurrentId() !== this._id) {
    return
  }
  return light.clear()
}

/**
 * Write a single pixel.
 *
 * @method pixel
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 * @param {number} pos - the position of the pixel to be written
 * @param {number} r - Red value. from 0 to 255
 * @param {number} g - Green value. from 0 to 255
 * @param {number} b - Red value. from 0 to 255
 * @param {number} a - Transparency value. from 0 to 1
 */
LightRenderingContext.prototype.pixel = function (pos, r, g, b, a) {
  if (this._getCurrentId() !== this._id) {
    return
  }
  Common.setPixel(pos, r, g, b, a)
  return light.pixel(pos, r, g, b, Common.ApplyAlphaFactor(a))
}

/**
 * Fill all pixels to the specified color.
 *
 * @method fill
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 * @param {number} r - Red value. from 0 to 255
 * @param {number} g - Green value. from 0 to 255
 * @param {number} b - Red value. from 0 to 255
 * @param {number} a - Transparency value. from 0 to 1
 */
LightRenderingContext.prototype.fill = function (r, g, b, a) {
  if (this._getCurrentId() !== this._id) {
    return
  }
  Common.setFill(r, g, b, a)
  return light.fill(r, g, b, Common.ApplyAlphaFactor(a))
}

/**
 * Perform callback after the specified time.
 *
 * @method requestAnimationFrame
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 * @param {function} cb - callback
 * @param {number} interval - millisecond
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
 * @callback yodaRT.light.LightRenderingContext~renderCallback
 * @param {number} r - the REG color.
 * @param {number} g - the GREEN color.
 * @param {number} b - the BLUE color.
 * @param {boolean} last - is the last frame
 */

/**
 * Make a transition. the fourth parameter will be true in callback when transition end.
 *
 * @method transition
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 * @param {yodaRT.light.Color} from - Specify the starting color of the transition.
 * @param {yodaRT.light.Color} to - Specify the end color of the transition.
 * @param {number} duration - Specify the duration of the transition.
 * @param {number} fps - Specify the fps of the transition.
 * @param {yodaRT.light.LightRenderingContext~renderCallback} cb - a function to
 *        receive rgb color in transitions.
 * @return {Promise<null>} when the last is computed, resolve the promise.
 */
LightRenderingContext.prototype.transition = function (from, to, duration, fps, cb) {
  if (this._getCurrentId() !== this._id) {
    return Promise.resolve()
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
  return new Promise((resolve, reject) => {
    var render = function (r, g, b) {
      left--
      if (left <= 0) {
        cb && cb(r, g, b, true)
        return resolve()
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
  })
}

/**
 * Make a breathing effect. The fourth parameter will be true in callback when breathing end.
 * @method breathing
 * @instance
 * @memberof yodaRT.light.LightRenderingContext
 * @param {number} r - Red value of the breathing effect.
 * @param {number} g - Green value of the breathing effect.
 * @param {number} b - Blue value of the breathing effect.
 * @param {number} duration - Specify the duration of the transition.
 * @param {number} fps - Specify the fps of the transition.
 * @param {yodaRT.light.LightRenderingContext~renderCallback} cb - a function to receive rgb
 *        color in breathing.
 * @return {Promise<null>} when the last is computed, resolve the promise.
 */
LightRenderingContext.prototype.breathing = function (r, g, b, duration, fps, cb) {
  if (this._getCurrentId() !== this._id) {
    return Promise.resolve()
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
  return new Promise((resolve, reject) => {
    var render = function (red, green, blue) {
      left--
      if (left <= 0) {
        cb && cb(red, green, blue, true)
        return resolve()
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
  })
}
