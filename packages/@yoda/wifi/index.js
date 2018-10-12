'use strict'

/**
 * @module @yoda/wifi
 * @description Provides classes to manage Wi-Fi functions on the device.
 */

var dns = require('dns')
var os = require('os')
var logger = require('logger')('wifi')
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
 * @property {string} ssid - The ssid of the router.
 * @property {number} signal - The signal of the router, it's range are (0, -100).
 */

module.exports = {
  /**
   * @var WIFI_INIVATE {number} - wifi is invalid
   */
  WIFI_INIVATE: 0,
  /**
   * @var WIFI_SCANING {number} - wifi is scanning, just waiting
   */
  WIFI_SCANING: 1,
  /**
   * @var WIFI_CONNECTED {number} - wifi is connected.
   */
  WIFI_CONNECTED: 2,
  /**
   * @var WIFI_UNCONNECTED {number} - the wifi is disconnected.
   */
  WIFI_UNCONNECTED: 3,
  /**
   * @var NETSERVER_CONNECTED {number} - the networking is connected.
   */
  NETSERVER_CONNECTED: 4,
  /**
   * @var NETSERVER_UNCONNECTED {number} - the networking is disconnected.
   */
  NETSERVER_UNCONNECTED: 5,
  /**
   * Sends the WI-FI config to network service, which would try to join immediately.
   * You may need to use `getWifiState()` or `getNetworkState()` to get if the network
   * is connected in interval.
   *
   * @function joinNetwork
   * @param {string} ssid - the wifi name
   * @param {string} [psk] - the wifi psk, an empty string or blanks would be ignored.
   * @param {string} [method=WPA2PSK] - the key method, available
   *                 methods are: "WPA2PSK", "WPAPSK", "WEP", "NONE".
   * @returns {number} the wpa_supplicant network id
   * @throws {Error} ssid must be a string.
   * @example
   * var wifi = require('@yoda/wifi')
   * wifi.joinNetwork(config.ssid, config.psk)
   * check()
   *
   * function check () {
   *   var state = wifi.getWifiState()
   *   if (state === wifi.WIFI_CONNECTED) {
   *     console.log('wifi is connected')
   *   } else {
   *     setTimeout(check, 500) // check after 500ms again
   *   }
   * }
   */
  joinNetwork: function joinNetwork (ssid, psk, method) {
    var m = keyMethods[method] || keyMethods.WPA2PSK
    if (typeof psk === 'string') {
      psk = psk.trim()
    }
    return native.joinNetwork(ssid, psk, m)
  },
  /**
   * This would check the current network.
   * @function checkNetwork
   * @param {number} timeout
   * @param {function} callback
   */
  checkNetwork: function checkNetwork (timeout, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function')
    }
    var interval = 300
    var hasHistory = native.getNumOfHistory() > 0
    if (!hasHistory) {
      return callback(null, false)
    }

    var self = this
    var state = 'wifi'
    var internetChecker = null
    var checkTimer = setTimeout(() => {
      clearTimeout(internetChecker)
      callback(null, false)
    }, timeout || 30 * 1000)

    ;(function checkInternet () {
      logger.info('checking internet on state:', state)
      if (state === 'wifi') {
        var s = native.getWifiState()
        if (s === self.WIFI_CONNECTED) {
          state = 'netserver'
        }
        internetChecker = setTimeout(checkInternet, interval)
      } else if (state === 'netserver') {
        var ip = os.networkInterfaces()['wlan0']
        if (!ip || (ip[0] && ip[0].address === '127.0.0.1')) {
          internetChecker = setTimeout(checkInternet, interval)
          return
        }
        dns.lookup('www.rokid.com', (err, addr) => {
          logger.info('dns looked up with addr', addr)
          state = null
          clearTimeout(checkTimer)
          if (err || !addr) {
            callback(null, false)
          } else {
            callback(null, true)
          }
        })
      }
    })()
  },
  /**
   * Get current wifi state.
   * @function getWifiState
   * @returns {number} available numbers are "WIFI_INIVATE", "WIFI_SCANING",
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
   * @returns {number} the same to getWifiState but for networking.
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
   * Enable scaning the WI-FI passively, it starts to scan and connect from histroy
   * list automatically once the connection state is disconnected.
   *
   * @function enableScanPassively
   * @returns {number} the status code.
   */
  enableScanPassively: native.enableScanPassively,
  /**
   * Disable the WI-FI.
   * It is to disconnect the current WI-FI, and doesn't do any scan after that.
   *
   * @function disableAll
   * @returns {number} the status code.
   */
  disableAll: native.disableAll,
  /**
   * Reset the DNS resolver, commonly it needs a call when network is connected.
   * @function resetDns
   * @returns {boolean}
   */
  resetDns: native.resetDns,
  /**
   * Reset the WIFI, it removes all the history WIFI config.
   * @function resetWifi
   * @returns {boolean}
   */
  resetWifi: native.resetWifi,
  /**
   * scan the wifi list, and use `getWifiList()` to get the results.
   * @function scan
   * @returns {boolean}
   */
  scan: native.scan,
  /**
   * Save the current WI-FI config in local file, in usual `/etc/wpa_supplicant`.
   * @function save
   * @returns {boolean}
   */
  save: native.save,
  /**
   * Get the number of the history.
   * @function getNumOfHistory
   * @returns {number}
   */
  getNumOfHistory: native.getNumOfHistory,
  /**
   * remove assign network depend on joinNetwork'id
   * @function removeNetwork
   * @param {int} id - joinNetwork return id
   * @returns {number}
   */
  removeNetwork: native.removeNetwork
}
