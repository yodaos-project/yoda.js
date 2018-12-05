'use strict'

/**
 * A wapper of httpdns.
 * @module @yoda/httpdns
 */

var native = require('./httpdns.node')

/**
 * start httpdns resolve.
 * @function syncService
 * @param {string} sn
 * @param {string} device
 * @param {number} [timeout]
 * @returns {boolean} true: start resoleve httpdns from GSLB
 */
exports.syncService = native.httpdnsResolveByGslb

/**
 * get ip addr by hostname.
 * @function resolve
 * @param {string} hostname
 * @returns {string} get ip addr
 */
exports.resolve = native.httpdnsGetIpByHost
