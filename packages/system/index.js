'use strict';

/**
 * @module system
 */

var native = require('./system.node');

/**
 * @method set
 * @param {String} stream - <optional> the stream type, tts/audio/alarm.
 * @param {Number} vol - the volume to set
 */
exports.reboot = native.reboot;

/**
 * imageUtils
 */
var imageUtils = {
  /**
   * @method verify
   */
  verify: native.verifyImage,
  /**
   * @method prepare
   */
  prepare: native.prepareImage,
};

/**
 * @method getImage
 * @return {ImageUtils}
 */
exports.getImage = function() {
  return imageUtils;
};

