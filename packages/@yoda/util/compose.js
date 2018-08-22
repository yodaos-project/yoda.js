'use strict'

/**
 * @module @yoda/util
 */

function noop (err) {
  if (err) {
    throw err
  }
}

/**
 * @callback ComposeMonad
 * @param {Function} callback - normal arbitrary callback function
 * @param {*} previous - result from previous monad
 * @returns {void} return value is discarded
 */

/**
 * Usage:
 *
 * ```javascript
 * compose([
 *  cb => fs.readFile('/homes/foobar/file.txt', 'utf8', cb),
 *  (cb, data) => httpClient.post('http://example.com', { body: data }, cb)
 * ], (err, res) => {
 *  ... do whatever you want
 * })
 * ```
 *
 * @function compose
 * @param {module:@yoda/util~ComposeMonad[]} monads
 * @param {Function} [callback] - finale callback, if no callback is specified,
 * result would be discarded, and error would be thrown
 */
module.exports = compose
function compose (monads, callback) {
  if (callback == null) {
    callback = noop
  }
  if (typeof callback !== 'function') {
    throw TypeError('Expect a function as second argument of compose.')
  }
  if (!Array.isArray(monads)) {
    throw TypeError('Expect array of functions on first argument of compose.')
  }
  step(0)

  function step (idx, accumulate) {
    if (idx >= monads.length) {
      return callback(null, accumulate)
    }
    var monad = monads[idx]
    if (typeof monad !== 'function') {
      throw TypeError(`Expect functions on compose, but got ${typeof monad} on index ${idx}.`)
    }
    function next (err, result) {
      if (err) {
        return callback(err)
      }
      step(idx + 1, result)
    }
    monad(next, accumulate)
  }
}
