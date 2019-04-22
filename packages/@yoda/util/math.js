'use strict'

var crypto = require('crypto')

/**
 * @memberof module:@yoda/util/math
 */

/**
 * This function returns a floating point, the pseudorandom number is in the range [0,1),
 * that is, from 0 (including 0) up, but not including 1 (excluding 1), then you can zoom
 * to the desired range.
 *
 * This function is a temporary replacement of `random()` in standard library `math`,
 * because that function has an unresolved issue which will return same number sequency
 * in each new process.
 * @returns {number} - pseudo randomized floating number within [0, 1).
 */
function random () {
  var r = crypto.randomBytes(4).toString('hex')
  r = parseInt(r, 16)
  return r / 0x100000000
}

/**
 * This function returns an integer number in the range of [0, n).
 * @param {number} n The upper range of the random number.
 * @returns {number} - pseudo randomized integer within [0, n).
 */
function randInt (n) {
  var r = random()
  return Math.floor(r * n)
}

/**
 * This function returns `true` or `false` by random.
 * @returns {boolean} - pseudo randomized boolean value.
 */
function randBool () {
  return randInt(2) === 0
}

module.exports.random = random
module.exports.randInt = randInt
module.exports.randBool = randBool
