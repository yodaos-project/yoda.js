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
 * @param {string} [options.method] - the http method, like `GET', 'POST', 'PUT'.
 * @param {string} [options.body] - the http body to send.
 * @param {number} [options.timeout] - the timeout in seconds.
 * @param {object} [options.headers] - the http headers.
 * @param {function} [callback] - the callback when request is done.
 */
exports.request = native.request

/**
 * Aborting all requests in current process, it closes `uv_async_t` handles in this library,
 * none of callbacks will be invoked after this.
 * @function abort
 */
exports.abort = native.abort
