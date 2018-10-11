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

var messageStreamInstance
var playerInstance

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
  }
}
