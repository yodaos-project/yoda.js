'use strict';

const binding = require('bindings')('property');

/**
 * export
 */
module.exports = {
  /**
   * @method get
   * @param {String} key
   */
  get(key) {
    return binding.get(key);
  },
  /**
   * @method set
   * @param {String} key
   * @param {String} val
   */
  set(key, val) {
    return binding.set(key, val + '');
  },
  /**
   * @getter {String} locale
   */
  get locale() {
    return this.get('ro.product.locale');
  },
  /**
   * @getter {String} version
   */
  get version() {
    return this.get('ro.rokid.build.version.release');
  }
};
