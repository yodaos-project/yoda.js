'use strict'

/**
 * Environment & configuration library. At `/etc/yoda`, the RT should provide
 * a required `/etc/yoda/env.json`.
 *
 * Before loading this module:
 *
 * - it reads the `persist.sys.rokid.env` value.
 * - checks if `/etc/yoda/env.${env}.json` exists.
 *   - if no, returns the default(`/etc/yoda/env.json`) object.
 * - update the default object by the given fields.
 *
 * A simple example:
 * ```
 * var env = require('@yoda/env')()
 * console.log(env.speechUri)
 *
 * var env = require('@yoda/env').load('test')
 * console.log(env.speechUri) // specify to load the `env.test.json`.
 * ```
 *
 * @module @yoda/env
 */

var fs = require('fs')
var property = require('@yoda/property')
var logger = require('logger')('env')
var defaults = require('/etc/yoda/env.json')
var config

/**
 * Get the current env object.
 * @function
 */
function get () {
  return Object.assign({}, config)
}

/**
 * Load the current env object by the specific `env` name.
 * @function
 * @param {string} [env] - specific name for that you want to load.
 * @returns {object} the loaded env object.
 */
function load (env) {
  if (!env) {
    config = defaults
    return
  }
  var loc = `/etc/yoda/env.${env}.json`
  if (fs.existsSync(loc)) {
    config = Object.assign({}, defaults, require(loc))
    logger.log(`use ${env} env`)
  }
  return get()
}

load(property.get('persist.sys.rokid.env'))
module.exports = get
module.exports.load = load
