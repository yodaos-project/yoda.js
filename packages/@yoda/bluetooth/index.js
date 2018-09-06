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

var helper = require('./lib/helper')
var messageStreamInstance
var playerInstance

module.exports = {
  /**
   * get the `BluetoothMessageStream` instance for messaging.
   * @returns {module:@yoda/bluetooth.BluetoothMessageStream}
   */
  getMessageStream: function () {
    if (!messageStreamInstance ||
      messageStreamInstance._eventSocket._closed === true) {
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
    if (!playerInstance ||
      playerInstance._eventSocket._closed === true) {
      var BluetoothPlayer =
        require('./player').BluetoothPlayer
      playerInstance = new BluetoothPlayer()
    }
    return playerInstance
  },
  /**
   * disconnect all the bluetooth.
   * @returns {module:@yoda/bluetooth.BluetoothPlayer}
   */
  disconnect: function () {
    helper.closeCmdSocket()
    if (messageStreamInstance) {
      messageStreamInstance.disconnect()
    }
    if (playerInstance) {
      playerInstance.disconnect()
    }
  }
}
