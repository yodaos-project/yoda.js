'use strict'

/**
 * @module @yoda/light
 * @description Use `light` module to control your LEDs.
 *
 * ```js
 * var light = require('@yoda/light');
 * light
 *   .fill(20, 20, 20, 0.7)
 *   .pixel(3, 255, 255, 255)
 *   .pixel(3, 233, 233, 200)
 *   .write();
 * ```
 *
 * As you can seen, this module provides the following main methods:
 * - `fill()`: fill the color on all the lights, and write immediately.
 * - `pixel()`: fill the color on the given light by index.
 * - `write()`: write the current buffer.
 */

var native = require('./light.node')
var logger = require('logger')('light')

/**
 * Describe the hardware features for the current light.
 * @typedef LightProfile
 * @property {Number} leds - the number of LEDs.
 * @property {Number} format - the color format, commonly 3 means rgb.
 * @property {Number} maximumFps - the maximum fps.
 * @property {Number} micAngle - the mic angle at zero.
 */

var config = native.getProfile()

var enabled = false;

(function bootstrap () {
  native.enable()
  enabled = true
})()
var globalAlphaFactor = 1
module.exports = {
  /**
   * set global alpha factor
   * @function setGlobalAlphaFactor
   * @param {number} - global alpha
   */
  setGlobalAlphaFactor: function (factor) {
    if (typeof factor === 'number' && factor >= 0 && factor <= 1) {
      globalAlphaFactor = factor
    } else {
      globalAlphaFactor = 1
    }
    logger.info(`set global aplha factor to ${factor} - ${globalAlphaFactor}`)
  },
  /**
   * Enable the light write
   * @function enable
   * @private
   */
  enable: function () {
    if (!enabled) {
      native.enable()
      enabled = true
    }
  },

  /**
   * Disable the light write
   * @function disable
   * @private
   */
  disable: function () {
    if (enabled) {
      native.disable()
      enabled = false
    }
  },

  /**
   * Render the current buffer
   * @function write
   * @param {Buffer} [explict] - if present, use the given buffer to write.
   */
  write: function writeBuffer (explict) {
    var r
    if (explict) {
      r = native.write(explict)
    } else {
      r = native.render()
    }
    if (r !== 0) {
      if (r === -16) {
        // FIXME(Yorkie): this should moved to native libs.
        logger.info('the current rendering is busy, lost this frame')
      } else {
        throw new Error('light value write error.')
      }
    }
    return this
  },

  /**
   * Get the hardware profile data
   * @function getProfile
   * @returns {module:@yoda/light~LightProfile}
   */
  getProfile: native.getProfile,

  /**
   * Fill all lights with the same color.
   * @function fill
   * @param {Number} red - the red number 0-255.
   * @param {Number} green - the green number 0-255.
   * @param {Number} blue - the blue number 0-255.
   * @param {Number} [alpha=1] - the alpha number.
   * @example
   * light.fill(255, 255, 233, 0.3); // this will render rgba(255,255,233,0.3)
   */
  fill: function fillColor (red, green, blue, alpha) {
    if (typeof alpha === 'number' && alpha >= 0 && alpha < 1) {
      alpha *= globalAlphaFactor
    } else {
      alpha = globalAlphaFactor
    }
    if (alpha < 1) {
      red = Math.floor(alpha * red)
      green = Math.floor(alpha * green)
      blue = Math.floor(alpha * blue)
    }
    native.fill(red, green, blue)
    return this
  },

  /**
   * Render a pixel with the a color
   * @function pixel
   * @param {Number} index - the index of the light LEDs.
   * @param {Number} red - the red number 0-255.
   * @param {Number} green - the green number 0-255.
   * @param {Number} blue - the blue number 0-255.
   * @param {Number} [alpha=1] - the alpha number.
   * @param {Number} [shading=false] - show shadow.
   * @example
   * light.pixel(3, 255, 255, 255) // this will light black on 3rd led.
   */
  pixel: function pixelColor (index, red, green, blue, alpha, shading) {
    this._pixel(index, red, green, blue, alpha)
    if (shading) {
      index = (index === 0) ? (config.leds - 1) : index - 1
      this._pixel(index, red, green, blue, 0.3)
      index = (index === 0) ? (config.leds - 1) : index - 1
      this._pixel(index, red, green, blue, 0.1)
    }
    return this
  },

  /**
   * Render a pixel with the a color
   * @function _pixel
   * @private
   */
  _pixel: function (index, red, green, blue, alpha) {
    alpha *= globalAlphaFactor
    if (alpha < 1) {
      red = Math.floor(alpha * red)
      green = Math.floor(alpha * green)
      blue = Math.floor(alpha * blue)
    }
    native.pixel(index, red, green, blue)
  },

  /**
   * Clear the light
   * @function clear
   */
  clear: function clearColor () {
    native.fill(0, 0, 0)
    return this
  }

}
