'use strict'

/**
 * @module @yoda/bluetooth
 * @description The YodaOS includes support for the Bluetooth network
 * stack, which allows a device to wirelessly exchange data with other
 * Bluetooth devices. Using the Bluetooth APIs, your application can
 * perform the followings:
 *
 * - Control Bluetooth playback.
 * - Transfer data to and from other devices.
 */

var logger = require('logger')('bluetooth-index')
var system = require('@yoda/system')
var messageStreamInstance = null
var playerInstance = null
var a2dpInstance = null

module.exports = {
  /**
   * get the `BluetoothMessageStream` instance for messaging.
   * @returns {module:@yoda/bluetooth.BluetoothMessageStream}
   */
  getMessageStream: function () {
    if (!messageStreamInstance) {
      var BluetoothMessageStream =
        require('./stream').BluetoothMessageStream
      messageStreamInstance = new BluetoothMessageStream()
    }
    return messageStreamInstance
  },
  /**
   * get the `BluetoothPlayer` instance for multimedia.
   * @returns {module:@yoda/bluetooth.BluetoothPlayer}
   */
  getPlayer: function () {
    if (!playerInstance) {
      var BluetoothPlayer = require('./player').BluetoothPlayer
      playerInstance = new BluetoothPlayer()
    }
    return playerInstance
  },
  /**
   * disconnect all the bluetooth.
   * @returns {module:@yoda/bluetooth.BluetoothPlayer}
   */
  disconnect: function () {
    if (messageStreamInstance) {
      messageStreamInstance.disconnect()
      messageStreamInstance = null
    }
    if (playerInstance) {
      playerInstance.disconnect()
      playerInstance = null
    }
    if (a2dpInstance) {
      a2dpInstance.destroy()
      a2dpInstance = null
    }
  },
  /**
   * @typedef {Object} PROFILE
   * @property {string} BLE - Bluetooth low energy profile.
   * @property {string} A2DP - Bluetooth advanced audio distribution profile.
   */
  /**
   * Get bluetooth adapter by profile name.
   * @param {PROFILE} profile - The profile name.
   */
  getAdapter: function (profile) {
    logger.debug(`getAdapter(${profile})`)
    switch (profile) {
      case this.protocol.PROFILE.A2DP:
        var BluetoothA2dp = require('./a2dp').BluetoothA2dp
        a2dpInstance = new BluetoothA2dp(system.getDeviceName())
        logger.info('Create -- BluetoothA2dp --')
        return a2dpInstance
      case this.protocol.PROFILE.BLE:
      default:
        return this.getMessageStream()
    }
  },
  /**
   * Get bluetooth protocol constant difinitions.
   * @example
   * var bluetooth = require('@yoda/bluetooth')
   * var protocol = bluetooth.protocol
   * var a2dp = bluetooth.getAdapter(protocol.PROFILE.A2DP)
   */
  protocol: require('./protocol.json')
}
