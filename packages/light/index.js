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
   * @function write
   * @memberof light
   * @param {Buffer} buffer - the led buffer to write
   */
  write: native.write,
  /**
   * @memberof light
   * @function getProfile
   */
  getProfile: native.getProfile,
};
