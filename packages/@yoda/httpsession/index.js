'use strict'

/**
 * A wapper of httpsession.
 * @module @yoda/httpsession
 */

var native = require('./httpsession.node')

/**
 * Send a http request.
 * @function request
 * @param {string} url
 * @param {object} options
 * @param {string} [options.method]
 * @param {string} [options.body]
 * @param {number} [timeout]
 * @param {boolean} [options.trust_all] trust all SSL certs
 * @param {object} [options.headers]
 * @param {function} [callback]
 */
exports.request = native.request

/**
 * Close uv_async_t in httpsession, none of callbacks will be invoked after this.
 * @function abort
 */
exports.abort = native.abort
