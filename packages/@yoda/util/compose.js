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
 * Also, in progress of composition, a break of rest of monads can be achieved by returning a
 * {@link module:@yoda/util.compose.Break}
 *
 * Example:
 *
 * ```javascript
 * compose([
 *  cb => fs.readFile('/homes/foobar/file.txt', 'utf8', cb),
 *  (cb, data) => {
 *    if (condition) {
 *      return compose.Break(data)
 *    }
 *    ... do rest of the operations
 *  },
 *  (cb, data) => {
 *    ... would not be invoked if broke
 *  }
 * ], (err, res) => {
 *  ... broken composition jumps here directly
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
/**
 * Setup a composition break
 * @memberof module:@yoda/util
 * @constructor
 * @param {*} value
 */
compose.Break = Break

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
  monads.forEach(monad => {
    if (typeof monad !== 'function') {
      throw TypeError(`Expect functions on compose, but got ${typeof monad} on index ${idx}.`)
    }
  })
  step(0)

  function step (idx, accumulate) {
    if (idx >= monads.length) {
      return callback(null, accumulate)
    }

    var broke = false
    function next (err, result) {
      if (broke) {
        return
      }
      if (err) {
        return callback(err)
      }
      step(idx + 1, result)
    }

    var monad = monads[idx]
    var ret = monad(next, accumulate)
    if (ret instanceof Break) {
      broke = true
      /** Broke composition and invoke callback directly */
      callback(null, ret.value)
    }
  }
}

function Break (value) {
  if (!(this instanceof Break)) {
    return new Break(value)
  }
  this.value = value
}
