'use strict'

/**
 * @module @yoda/manifest
 * @description provide device manifest information.
 */

var fs = require('fs')
var _ = require('@yoda/util')._

var data = fs.readFileSync('/etc/manifest.json', 'utf8')
var manifest
try {
  manifest = JSON.parse(data)
} catch (err) {
  throw new Error('Malformed /etc/manifest.json')
}
var capabilities = manifest.capabilities || {}
var defaults = manifest.defaults || {}

module.exports.get = get
/**
 *
 * @param {string} path - manifest path to fetch
 * @param {any} defaults - fallbacks if given path is not specified in manifest
 * @returns {any}
 */
function get (path, defaults) {
  return _.get(manifest, path, defaults)
}

module.exports.isCapabilityEnabled = isCapabilityEnabled
/**
 *
 * @param {string} feature - feature name to be determined
 * @returns {boolean} - true if feature is enabled
 */
function isCapabilityEnabled (feature) {
  return !!_.get(capabilities, feature)
}

module.exports.getDefaultValue = getDefaultValue
/**
 *
 * @param {string} key - default value name to be fetched
 * @returns {any} - default value
 */
function getDefaultValue (key) {
  return _.get(defaults, key)
}
