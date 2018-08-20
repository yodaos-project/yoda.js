'use strict';

/**
 * @namespace system
 */

var native = require('./system.node');

/**
 * @var {String} OTA_IMAGE_URI - The uri of your ota image, "/data/upgrade/upgrade.img".
 * @memberof system
 */
exports.OTA_IMAGE_URI = '/data/upgrade/upgrade.img';

/**
 * Reboot the system.
 * @memberof system
 * @function reboot
 * @returns {Boolean}
 */
exports.reboot = native.reboot;

/**
 * Verify the OTA image, including hash(md5) check, section check and header check.
 * @memberof system
 * @function verifyOtaImage
 * @returns {Boolean}
 */
exports.verifyOtaImage = native.verifyOtaImage;

/**
 * Prepare the OTA image. It should be called before start upgrading.
 * @memberof system
 * @function prepareOtaImage
 * @returns {Boolean}
 */
exports.prepareOtaImage = native.prepareOtaImage;
