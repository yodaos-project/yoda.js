'use strict';

/**
 * @namespace property
 */

var native = require('./property.node');

module.exports = {
  /**
   * @memberof property
   * @param {String} key
   */
  get: native.get,

  /**
   * @memberof property
   * @param {String} key
   * @param {String} val
   */
  set: native.set,
};
