'use strict'

var logger = require('logger')('bluetooth-index')
var property = require('@yoda/property')

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

var uuid = (property.get('ro.boot.serialno') || '').substr(-6)
var productName = property.get('ro.rokid.build.productname') || 'Rokid-Me'
var deviceName = [ productName, uuid ].join('-')

var messageStreamInstance

var bleInstance = null

var a2dpRef = 0
var a2dpInstance = null

module.exports = {

  PROFILE_BLE: 'BLE',
  PROFILE_A2DP: 'A2DP',

  A2DP_MODE_SNK: 'SNK',
  A2DP_MODE_SRC: 'SRC',

  RADIO_STATE_ON: 'RADIO ON',
  RADIO_STATE_OFF: 'RADIO OFF',
  RADIO_STATE_ON_FAILED: 'RADIO ON FAILED',

  CONNECTION_STATE_CONNECTED: 'CONNECTED',
  CONNECTION_STATE_DISCONNECTED: 'DISCONNECTED',
  CONNECTION_STATE_CONNECT_FAILED: 'CONNECT FAILED',
  CONNECTION_STATE_AUTOCONNECT_FAILED: 'AUTOCONNECT FAILED',

  AUDIO_STATE_PLAYING: 'PLAYING',
  AUDIO_STATE_PAUSED: 'PAUSED',
  AUDIO_STATE_STOPPED: 'STOPPED',
  AUDIO_STATE_VOLUMN_CHANGED: 'VOLUMN CHANGED',

  DISCOVERY_STATE_ON: 'DISCOVERY ON',
  DISCOVERY_STATE_OFF: 'DISCOVERY OFF',
  DISCOVERY_DEVICE_LIST_CHANGED: 'DEVICE LIST CHANGED',

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
   * disconnect all the bluetooth.
   * @returns {module:@yoda/bluetooth.BluetoothPlayer}
   */
  disconnect: function () {
    if (messageStreamInstance) {
      messageStreamInstance.disconnectConnection()
      messageStreamInstance = null
    }
    if (bleInstance) {
      bleInstance.disconnectConnection()
      bleInstance = null
    }
    if (a2dpInstance) {
      a2dpInstance.disconnectConnection()
      a2dpInstance = null
    }
  },

  getName: function () {
    return deviceName
  },

  getAdapter: function (profile) {
    logger.debug(`getAdapter(${profile})`)
    switch (profile) {
      case this.PROFILE_BLE:
      default:
        return this.getBle()
      case this.PROFILE_A2DP:
        return this.getA2dp()
    }
  },

  recycle: function (profile) {
    logger.debug(`recycle(${profile})`)
    switch (profile) {
      case this.PROFILE_BLE:
      default:
        break
      case this.PROFILE_A2DP:
        logger.info(`recycle(${profile} ref=${a2dpRef} instance=${a2dpInstance})`)
        a2dpRef--
        if (a2dpRef <= 0 && a2dpInstance != null) {
          a2dpInstance.destroyConnection()
          a2dpInstance = null
        }
        break
    }
  },

  getBle: function (name) {
    if (!bleInstance) {
      var BluetoothBle = require('./ble').BluetoothBle
      bleInstance = new BluetoothBle(deviceName)
    }
    return bleInstance
  },

  getA2dp: function () {
    logger.info(`getA2dp(ref=${a2dpRef} instance=${a2dpInstance})`)
    if (a2dpInstance == null) {
      a2dpRef = 0
      var BluetoothA2dp = require('./a2dp').BluetoothA2dp
      a2dpInstance = new BluetoothA2dp(deviceName)
      logger.info(' ###### Create new -- BluetoothA2dp --')
    }
    a2dpRef++
    return a2dpInstance
  }
}
