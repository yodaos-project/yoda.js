'use strict'

/**
 * @module @yoda/property
 * @description
 * A property is an abstraction that can be used to represent a mutable
 * value that is held in a host object.
 *
 * ```js
 * var prop = require('@yoda/property');
 * prop.get('ro.boot.serialno');
 * prop.set('foobar', 'testkey');
 * ```
 *
 * The property key has 3 schemas for different purposes:
 * - persistent key: the key starts with `persist.`, these key and
 *   values are stored in persistent.
 * - readonly key: the key starts with `ro.*`, these key and values
 *   are readonly.
 * - normal key: otherwise are read and write, but in-memory.
 */

var native = require('./property.node')
var PROP_VALUE_MAX = native.PROP_VALUE_MAX

function normalize (key, flag) {
  if (typeof key !== 'string') {
    throw new TypeError(`key must be a string "${key}"`)
  }
  if (key === '') {
    throw new TypeError('key must not be empty string')
  }
  if (!/^[a-z0-9.\-_]+$/i.test(key)) {
    throw new TypeError('invalid key, it must be string with dot')
  }

  if (flag === 'persist') {
    key = `persist.${key}`
  } else if (flag === 'readonly') {
    key = `ro.${key}`
  }

  if (PROP_VALUE_MAX < key.length) {
    throw new Error(`the key length should be less than ${PROP_VALUE_MAX}`)
  }
  return key
}

module.exports = {
  /**
   * @function get
   * @param {String} key - the property key.
   * @param {String} [flag] - the flag for set operation, available
   *                 values are: persistent and readonly.
   * @returns {String|Number} returns the value by the given key.
   * @throws {TypeError} key must be a string.
   * @throws {TypeError} key must not be empty string.
   */
  get: function (key, flag) {
    key = normalize(key, flag)
    return native.get(key)
  },

  /**
   * @function set
   * @param {String} key - the property key.
   * @param {String} val - the property val to set.
   * @param {String} [flag] - the flag for set operation, available
   *                 values are: persistent and readonly.
   * @throws {TypeError} key must be a string.
   * @throws {TypeError} key must not be empty string.
   * @throws {TypeError} value must be required to be not undefined or null.
   */
  set: function (key, val, flag) {
    key = normalize(key, flag)
    if (val === undefined || val === null) {
      throw new TypeError('value must be required to be not undefined or null')
    }
    native.set(key, val)
  }
}
