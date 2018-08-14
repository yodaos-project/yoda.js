'use strict';

/**
 * @namespace property
 * @description
 * A property is an abstraction that can be used to represent a mutable
 * value that is held in a host object.
 * 
 * ```js
 * var prop = require('property');
 * prop.get('ro.boot.serialno');
 * prop.set('foobar', 'testkey');
 * ```
 *
 * The property key has 3 schemas for different purposes:
 * - persistent key: the key starts with `persist`, these key and
 *   values are stored in persistent.
 * - readonly key: the key starts with `ro.*`, these key and values
 *   are readonly.
 * - normal key: otherwise are read and write, but in-memory.
 */

var native = require('./property.node');

module.exports = {
  /**
   * @memberof property
   * @function get
   * @param {String} key - the property key.
   */
  get: native.get,

  /**
   * @memberof property
   * @function set
   * @param {String} key - the property key.
   * @param {String} val - the property val to set.
   */
  set: native.set,
};
