'use strict';

/**
 * @namespace wifi
 */

var native = require('./wifi.node');

module.exports = {
  /**
   * @memberof wifi
   * @var WIFI_INIVATE {Number} - wifi is invalid
   */
  WIFI_INIVATE: 0,
  /**
   * @memberof wifi
   * @var WIFI_SCANING {Number} - wifi is scanning, just waiting
   */
  WIFI_SCANING: 1,
  /**
   * @memberof wifi
   * @var WIFI_CONNECTED {Number} - wifi is connected.
   */
  WIFI_CONNECTED: 2,
  /**
   * @memberof wifi
   * @var WIFI_UNCONNECTED {Number} - the wifi is disconnected.
   */
  WIFI_UNCONNECTED: 3,
  /**
   * @memberof wifi
   * @var NETSERVER_CONNECTED {Number} - the networking is connected.
   */
  NETSERVER_CONNECTED: 4,
  /**
   * @memberof wifi
   * @var NETSERVER_UNCONNECTED {Number} - the networking is disconnected.
   */
  NETSERVER_UNCONNECTED: 5,
  /**
   * Connect a WI-FI via ssid, psk and method.
   * @memberof wifi
   * @function joinNetwork
   * @param {String} ssid
   * @param {String} psk
   */
  joinNetwork: native.joinNetwork,
  /**
   * Get current wifi state.
   * @memberof wifi
   * @function getWifiState
   */
  getWifiState: native.getWifiState,
  /**
   * Get current networking state.
   * @memberof wifi
   * @function getNetworkState
   */
  getNetworkState: native.getNetworkState,
  /**
   * Disable the WI-FI.
   * @memberof wifi
   * @function disableAll
   */
  disableAll: native.disableAll,
  /**
   * Reset the DNS resolver, commonly it needs a call when network is connected.
   * @memberof wifi
   * @function resetDns
   */
  resetDns: native.resetDns,
  /**
   * Save the current WI-FI config in local file.
   * @memberof wifi
   * @function save
   */
  save: native.save,
};

