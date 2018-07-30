'use strict';

/**
 * @namespace light
 */

var native = require('./light.node');

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
   */
  getProfile: native.getProfile,
};
