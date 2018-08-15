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
};
