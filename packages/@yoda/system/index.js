'use strict'

/**
 * @module @yoda/system
 */

var native = require('./system.node')

/**
 * Reboot the system.
 * @function reboot
 * @returns {Boolean}
 * @private
 */
exports.reboot = function reboot () {
  process.nextTick(() => native.reboot())
  return true
}

/**
 * Verify the OTA image, including hash(md5) check, section check and header check.
 * @function verifyOtaImage
 * @returns {Boolean}
 * @private
 */
exports.verifyOtaImage = native.verifyOtaImage

/**
 * Prepare the OTA procedure. It should be called before start upgrading.
 * @function prepareOta
 * @private
 * @param {string} path the image path to be installed, **empty string** if resetting ota
 * @returns {Number} native method status code, 0 on success, non-0 otherwise
 */
exports.prepareOta = function prepareOta (path) {
  if (typeof path !== 'string') {
    return TypeError('Expect a string on first argument of prepareOta')
  }
  return native.prepareOta(path)
}

/**
 * @private
 * @function getRecoveryState
 */
exports.getRecoveryState = function getRecoveryState () {
  return native.getRecoveryState()
}

/**
 * Set the system as recovery mode.
 *
 * @function diskUsage
 * @param {string} path - the path to be analyzed
 * @returns {module:@yoda/system~DiskUsage}
 */
exports.setRecoveryMode = function () {
  return native.setRecoveryMode()
}

/**
 * @private
 * @function setRecoveryOk
 */
exports.onRecoveryComplete = function onRecoveryComplete () {
  return native.setRecoveryOk()
}

/**
 * @typedef DiskUsage
 * @property {number} available
 * @property {number} free
 * @property {number} total
 */

/**
 * Get disk usage at a path.
 *
 * @function diskUsage
 * @param {string} path - the path to be analyzed
 * @returns {module:@yoda/system~DiskUsage}
 */
exports.diskUsage = function diskUsage (path) {
  if (typeof path !== 'string') {
    return TypeError('Expect a string on first argument of diskUsage')
  }
  return native.diskUsage(path)
}

/**
 * convert  a  string  representation  of time to a time `tm` structure.
 * @function parseDateString
 * @param {string} date - the date string.
 * @param {string} format - the format.
 * @returns {Date} the returned date.
 */
exports.parseDateString = function parseDateString (date, format) {
  if (typeof date !== 'string') {
    throw new TypeError('date must be a string.')
  }
  if (typeof format !== 'string') {
    throw new TypeError('format must be a string')
  }
  return native.strptime(date, format)
}
