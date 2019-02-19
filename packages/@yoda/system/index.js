'use strict'

/**
 * @module @yoda/system
 */

var native = require('./system.node')
var property = require('@yoda/property')

/**
 * Power off the device.
 * @function powerOff
 * @param {string} [reason] - persist power off reason for easy debugging.
 * @returns {boolean}
 * @private
 */
exports.powerOff = function powerOff (reason) {
  property.set('sys.power_off.reason', reason || 'system', 'persist')
  property.set('sys.power_off.time', new Date().toISOString(), 'persist')
  process.nextTick(() => native.powerOff())
  return true
}

/**
 * Reboot the system into charging mode.
 * @function rebootCharging
 * @returns {boolean}
 * @private
 */
exports.rebootCharging = function rebootCharging () {
  property.set('sys.power_off.reason', 'charging', 'persist')
  property.set('sys.power_off.time', new Date().toISOString(), 'persist')
  process.nextTick(() => native.rebootCharging())
  return true
}

/**
 * Reboot the system.
 * @function reboot
 * @param {string} [reason] - persist power off reason for easy debugging.
 * @returns {boolean}
 * @private
 */
exports.reboot = function reboot (reason) {
  property.set('sys.power_off.reason', reason || 'reboot', 'persist')
  property.set('sys.power_off.time', new Date().toISOString(), 'persist')
  process.nextTick(() => native.reboot())
  return true
}

/**
 * Verify the OTA image, including hash(md5) check, section check and header check.
 * @function verifyOtaImage
 * @returns {boolean}
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

/**
 * Get unified device name.
 * @returns {string} the device name.
 */
exports.getDeviceName = function getDeviceName () {
  var uuid = (property.get('ro.boot.serialno') || '').substr(-6)
  var productName = property.get('ro.rokid.build.productname') || 'Rokid-speaker-'
  var deviceName = [ productName, uuid ].join('-')
  return deviceName
}
