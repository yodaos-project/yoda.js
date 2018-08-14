'use strict';

/**
 * @namespace system
 */

var native = require('./system.node');

/**
 * Reboot the system.
 * @memberof system
 * @function reboot
 */
exports.reboot = native.reboot;

/**
 * @memberof system
 * @class ImageUtils
 */
var ImageUtils = {
  /**
   * @memberof system.ImageUtils
   * @function verify
   */
  verify: native.verifyImage,
  /**
   * @memberof system.ImageUtils
   * @function prepare
   */
  prepare: native.prepareImage,
};

/**
 * @memberof system
 * get image
 */
exports.getImage = function() {
  return ImageUtils;
};

