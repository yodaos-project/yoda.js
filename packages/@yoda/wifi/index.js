'use strict'

/**
 * @module @yoda/wifi
 * @description Provides classes to manage Wi-Fi functions on the device.
 */

var native = require('./wifi.node')
var keyMethods = {
  'WPA2PSK': 0,
  'WPAPSK': 1,
  'WEP': 2,
  'NONE': 3,
  'OTHER': 4
}

/**
 * Describe the WI-FI information.
 * @typedef WifiInfo
 * @property {String} ssid - The ssid of the router.
 * @property {Number} signal - The signal of the router, it's range are (0, -100).
 */

module.exports = {
  /**
   * @var WIFI_INIVATE {Number} - wifi is invalid
   */
  WIFI_INIVATE: 0,
  /**
   * @var WIFI_SCANING {Number} - wifi is scanning, just waiting
   */
  WIFI_SCANING: 1,
  /**
   * @var WIFI_CONNECTED {Number} - wifi is connected.
   */
  WIFI_CONNECTED: 2,
  /**
   * @var WIFI_UNCONNECTED {Number} - the wifi is disconnected.
   */
  WIFI_UNCONNECTED: 3,
  /**
   * @var NETSERVER_CONNECTED {Number} - the networking is connected.
   */
  NETSERVER_CONNECTED: 4,
  /**
   * @var NETSERVER_UNCONNECTED {Number} - the networking is disconnected.
   */
  NETSERVER_UNCONNECTED: 5,
  /**
   * Connect a WI-FI via ssid, psk and method.
   * @function joinNetwork
   * @param {String} ssid - the wifi name
   * @param {String} psk - the wifi psk
   * @param {String} [method=WPA2PSK] - the key method, available
   *                 methods are: "WPA2PSK", "WPAPSK", "WEP", "NONE".
   */
  joinNetwork: function joinNetwork (ssid, psk, method) {
    var m = keyMethods[method] || keyMethods.WPA2PSK
    if (typeof psk === 'string') {
      psk = psk.trim()
    }
    return native.joinNetwork(ssid, psk, m)
  },
  /**
   * Get current wifi state.
   * @function getWifiState
   * @returns {Number} available numbers are "WIFI_INIVATE", "WIFI_SCANING",
   *                   "WIFI_CONNECTED" and "WIFI_UNCONNECTED".
   * @example
   * var wifi = require('@yoda/wifi')
   * if (wifi.getWifiState() === wifi.WIFI_UNCONNECTED) {
   *   console.log('wifi is not connected')
   * }
   */
  getWifiState: native.getWifiState,
  /**
   * Get current networking state.
   * @function getNetworkState
   * @returns {Number} the same to getWifiState but for networking.
   * @example
   * var wifi = require('@yoda/wifi')
   * if (wifi.getNetworkState() === wifi.NETSERVER_CONNECTED) {
   *   console.log('network is connected')
   * }
   */
  getNetworkState: native.getNetworkState,
  /**
   * Get the current wifi list, before fetching the list, you may need to call `scan()`.
   * @function getWifiList
   * @returns {module:@yoda/wifi~WifiInfo[]}
   */
  getWifiList: native.getWifiList,
  /**
   * Disable all the WI-FI.
   * @function disableAll
   * @returns {Number} the status code.
   */
  disableAll: native.disableAll,
  /**
   * Reset the DNS resolver, commonly it needs a call when network is connected.
   * @function resetDns
   * @returns {Boolean}
   */
  resetDns: native.resetDns,
  /**
   * scan the wifi list, and use `getWifiList()` to get the results.
   * @function scan
   * @returns {Boolean}
   */
  scan: native.scan,
  /**
   * Save the current WI-FI config in local file, in usual `/etc/wpa_supplicant`.
   * @function save
   * @returns {Boolean}
   */
  save: native.save
}
