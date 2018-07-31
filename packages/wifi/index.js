'use strict';

/**
 * @namespace wifi
 */

var native = require('./wifi.node');

module.exports = {
  /**
   * @memberof wifi
   */
  joinNetwork: native.joinNetwork,
  /**
   * @memberof wifi
   */
  getWifiState: native.getWifiState,
  /**
   * @memberof wifi
   */
  getNetworkState: native.getNetworkState,
  /**
   * @memberof wifi
   */
  disableAll: native.disableAll,
  /**
   * @memberof wifi
   */
  resetDns: native.resetDns,
  /**
   * @memberof wifi
   */
  save: native.save,
};
