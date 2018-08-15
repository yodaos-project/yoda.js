'use strict';

/**
 * @namespace light
 */

var native = require('./light.node');

/**
 * Describe the hardware features for the current light.
 * @typedef {Object} light.LightProfile
 * @property {Number} leds - the number of LEDs.
 * @property {Number} format - the color format, commonly 3 means rgb.
 * @property {Number} maximumFps - the maximum fps.
 * @property {Number} micAngle - the mic angle at zero.
 */

var config = native.getProfile();
var length = config.leds * (config.format || 3);
var buffer = new Buffer(length);

module.exports = {
  
  /**
   * Enable the light write
   * @memberof light
   * @function enable
   */
  enable: native.enable,
  
  /**
   * Disable the light write
   * @memberof light
   * @function disable
   */
  disable: native.disable,
  
  /**
   * @example <caption>example for write</caption>
   * var buf = new Buffer(36);
   * buf.fill(0, 36);
   * light.write(buf);
   *
   * @function write
   * @memberof light
   * @param {Buffer} buffer - the led buffer to write
   */
  write: native.write,
  
  /**
   * Get the hardware profile data
   * @memberof light
   * @function getProfile
   * @returns {light.LightProfile}
   */
  getProfile: native.getProfile,
  
  /**
   * Fill all lights with the same color.
   * @memberof light
   * @function fill
   * @param {Number} red - the red number 0-255.
   * @param {Number} green - the green number 0-255.
   * @param {Number} blue - the blue number 0-255.
   * @param {Number} [alpha=1] - the alpha number.
   */
  fill: function fillColor(red, green, blue, alpha) {
    if (red === green && green === blue) {
      buffer.fill(red, length);
      return;
    }
    for (var i = 0; i < config.leds; i++) {
      this._pixel(i, red, green, blue, alpha);
    }
    return this.write(buffer);
  },
  
  /**
   * Render a pixel with the a color
   * @memberof light
   * @function pixel
   * @param {Number} index - the index of the light LEDs.
   * @param {Number} red - the red number 0-255.
   * @param {Number} green - the green number 0-255.
   * @param {Number} blue - the blue number 0-255.
   * @param {Number} [alpha=1] - the alpha number.
   * @param {Number} [shading=false] - show shadow.
   */
  pixel: function pixelColor(index, red, green, blue, alpha, shading) {
    this._pixel(index, red, green, blue, alpha);
    if (shading) {
      index = (index === 0) ? (config.leds - 1) : index - 1;
      this._pixel(index, red, green, blue, 0.3);
      index = (index === 0) ? (config.leds - 1) : index - 1;
      this._pixel(index, red, green, blue, 0.1);
    }
    return this.write(buffer);
  },
  
  /**
   * Render a pixel with the a color
   * @memberof light
   * @function _pixel
   * @private
   */
  _pixel: function(index, red, green, blue, alpha) {
    if (typeof alpha === 'number' && alpha >= 0 && alpha < 1) {
      red = Math.floor(alpha * red);
      green = Math.floor(alpha * green);
      blue = Math.floor(alpha * blue);
    }
    buffer.writeUInt8(red,    0 + index * 3);
    buffer.writeUInt8(green,  1 + index * 3);
    buffer.writeUInt8(blue,   2 + index * 3);
  },
};
