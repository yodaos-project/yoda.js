'use strict';

/**
 * @namespace system
 */

var native = require('./system.node');

/**
 * @memberof system
 * @param {String} stream - <optional> the stream type, tts/audio/alarm.
 * @param {Number} vol - the volume to set
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

