'use strict'
/**
 * @module lockfile
 */

/**
 * @typedef Opts
 * @property {Number} wait - A number of milliseconds to wait for locks to expire
 * before giving up. Only used by lockFile.lock. Poll for `opts.wait` ms.
 * If the lock is not cleared by the time the wait expires, then it returns with the original error.
 * @property {Number} pollPeriod - When using `opts.wait`, this is the period in ms in
 * which it polls to check if the lock has expired. Defaults to `100`.
 * @property {Number} stale - A number of milliseconds before locks are considered to have expired.
 * @property {Number} retries - Used by lock and lockSync. Retry `n` number of times before giving up.
 * @property {Number} retryWait - Used by lock. Wait n milliseconds before retrying.
 */

/**
 * Acquire a file lock on the specified path
 * @function lock
 * @param {String} path
 * @param {module:lockfile~Opts} [opts]
 * @param {Function} callback
 */

/**
 * Acquire a file lock on the specified path
 * @function lockSync
 * @param {String} path
 * @param {module:lockfile~Opts} [opts]
 */

/**
 * Close and unlink the lockfile.
 * @function unlock
 * @param {String} path
 * @param {Function} callback
 */

/**
 * Close and unlink the lockfile.
 * @function unlockSync
 * @param {String} path
 */

/**
 * @callback checkCallback
 * @param {Error} error
 * @param {Boolean} isLocked
 */

/**
 * Check if the lockfile is locked and not stale.
 * Callback is called with `cb(error, isLocked)`.
 * @function check
 * @param {String} path
 * @param {module:lockfile~Opts} [opts]
 * @param {module:lockfile~checkCallback} callback
 */

/**
 * Check if the lockfile is locked and not stale.
 * @function checkSync
 * @param {String} path
 * @param {module:lockfile~Opts} [opts]
 * @returns {Boolean}
 */

module.exports = require('./lockfile')
