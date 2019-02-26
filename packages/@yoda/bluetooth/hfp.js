'use strict'

var logger = require('logger')('bluetooth-hfp')
var EventEmitter = require('events').EventEmitter
var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')
var protocol = require('./protocol.json')
var stateFilters = require('./hfp-statemap').stateFilters

/**
 * @typedef {object} PROFILE
 * @property {string} BLE - Bluetooth low energy profile.
 * @property {string} A2DP - Bluetooth advanced audio distribution profile.
 * @property {string} HFP - Bluetooth hands-free profile.
 */

/**
 * @typedef {object} RADIO_STATE
 * @property {string} ON - Bluetooth radio state is ON.
 * @property {string} OFF - Bluetooth radio state is OFF.
 * @property {string} ON_FAILED - Turn on bluetooth radio failed.
 */

/**
 * @typedef {object} CONNECTION_STATE
 * @property {string} CONNECTED - Successfully connected to remote device.
 * @property {string} DISCONNECTED - Disconnected from remote deivce.
 * @property {string} CONNECT_FAILED - Failed to connect to remote device.
 * @property {string} AUTOCONNECT_FAILED - Auto connection to history paired device failed after turn on bluetooth.
 */

/**
 * When bluetooth's radio state is changed, such as on/off.
 * @event module:@yoda/bluetooth.BluetoothHfp#radio_state_changed
 */

/**
 * When bluetooth's connection state is changed, such as connected/disconnected.
 * @event module:@yoda/bluetooth.BluetoothHfp#connection_state_changed
 */

/**
 * When bluetooth's call state is changed, such as idle/incoming.
 * @event module:@yoda/bluetooth.BluetoothHfp#call_state_changed
 */

/**
 * Use `bluetooth.getAdapter(PROFILE.HFP)` instead of this constructor.
 * @memberof module:@yoda/bluetooth
 * @constructor
 * @extends EventEmitter
 * @param {string} deviceName - The device name.
 */
class BluetoothHfp extends EventEmitter {
  constructor (deviceName) {
    super()
    this.lastMsg = {
      'hfpstate': 'invalid', // opened, open failed, closing, closed, invalid.
      'connect_state': 'invalid', // connecting, connected, connect failed, disconnecting, disconnected, invalid.
      'connect_address': null,
      'connect_name': null,
      'service': 'active', // inactive, active.
      'call': 'inactive', // inactive, active.
      'setup': 'none', // none, incoming, outgoing, alerting.
      'held': 'none', // none, hold_active, hold.
      'audio': 'off' // on, off.
    }
    this._end = false
    this.localName = deviceName // local bluetooth device name

    this._flora = new FloraComp('bluetooth-hfp', {
      'uri': 'unix:/var/run/flora.sock',
      'bufsize': 40960,
      'reconnInterval': 10000
    })
    this._flora.handlers = {
      'bluetooth.hfp.event': this._onEvent.bind(this)
    }
    this._flora.init()
  }

  matchState (msg, filter) {
    return (filter.hfpstate === msg.hfpstate || filter.hfpstate === undefined) &&
      (filter.connect_state === msg.connect_state || filter.connect_state === undefined) &&
      (filter.service === msg.service || filter.service === undefined) &&
      (filter.call === msg.call || filter.call === undefined) &&
      (filter.setup === msg.setup || filter.setup === undefined) &&
      (filter.held === msg.held || filter.held === undefined) &&
      (filter.audio === msg.audio || filter.audio === undefined)
  }

  _onEvent (data) {
    if (this._end) {
      logger.warn(`Already destroied!`)
      return
    }
    var msg = JSON.parse(data[0] + '')
    logger.debug(`on event(action:${msg.action})`)

    if (msg.action === 'stateupdate') {
      var last = this.lastMsg
      logger.debug(`last: ${last.hfpstate} ${last.connect_state} ${last.call} ${last.setup} ${last.held} ${last.audio}`)
      logger.debug(`now:  ${msg.hfpstate} ${msg.connect_state} ${msg.call} ${msg.setup} ${msg.held} ${msg.audio}`)
      if (this.matchState(msg, this.lastMsg)) {
        logger.warn(`Received same msg!`)
        return
      }
      if (msg.setup === 'alerting') {
        this.lastMsg.setup = 'none'
        logger.warn(`Ignore alerting msg to avoid disturb incoming & outgoing!`)
        return
      }
      this.lastMsg = Object.assign(this.lastMsg, msg)
      var stateHit = false
      stateFilters.forEach((filter) => {
        if (this.matchState(msg, filter.inflowMsg)) {
          var event = filter.outflowEvent
          logger.debug(`Match ${event.type}.${event.state}`)
          this.emit(event.type, event.state)
          stateHit = true
        }
      })
      if (!stateHit) {
        logger.warn(`Mismatch state, please check state-mapping!`)
      }
    } else if (msg.action === 'ring') {
      this.emit('call_state_changed', protocol.CALL_STATE.RING, {play: msg.audio !== 'on'})
    }
  }

  _send (cmdstr, props) {
    var data = Object.assign({ command: cmdstr }, props)
    var msg = [ JSON.stringify(data) ]
    return this._flora.post('bluetooth.hfp.command', msg, floraFactory.MSGTYPE_INSTANT)
  }

  /**
   * Turn on the bluetooth. It will starts `hands-free profile`.
   *
   * You can listen following changed states:
   * - `protocol.RADIO_STATE.ON` when bluetooth is opened successfully.
   * - `protocol.RADIO_STATE.ON_FAILED` when bluetooth cannot be opened.
   *
   * @returns {null}
   * @fires module:@yoda/bluetooth/BluetoothHfp#radio_state_changed
   * @example
   * var bluetooth = require('@yoda/bluetooth')
   * var protocol = bluetooth.protocol
   * var hfp = bluetooth.getAdapter(protocol.PROFILE.HFP)
   * hfp.on('radio_state_changed', function (state) {
   *   console.log(`bluetooth state: ${state}`)
   * })
   * hfp.open()
   */
  open () {
    logger.debug(`open()`)
    var msg = {
      name: this.localName,
      unique: false
    }
    this._send('ON', msg)
  }

  /**
   * Turn off the bluetooth.
   *
   * You can listen following changed state events:
   * - `protocol.RADIO_STATE.OFF` when bluetooth is closed.
   *
   * @returns {null}
   * @fires module:@yoda/bluetooth/BluetoothHfp#radio_state_changed
   */
  close () {
    logger.debug(`close(${this.lastMsg.hfpstate})`)
    if (this.lastMsg.hfpstate === 'closed') {
      logger.warn('close() while last state is already closed.')
    }
    this._send('OFF')
  }

  /**
   * Answer incoming call.
   * @return {null}
   * @fires module:@yoda/bluetooth/BluetoothHfp#call_state_changed
   */
  answer () {
    logger.debug(`answer()`)
    this._send('ANSWERCALL')
  }

  /**
   * Hang up call.
   * @return {null}
   * @fires module:@yoda/bluetooth/BluetoothHfp#call_state_changed
   */
  hangup () {
    logger.debug(`hangup()`)
    this._send('HANGUP')
  }

  /**
   * Outgoing a call.
   * @param {string} number - Specify the destination phone number.
   * @return {null}
   * @fires module:@yoda/bluetooth/BluetoothHfp#call_state_changed
   */
  dial (number) {
    logger.debug(`dial(${number})`)
    this._send('DIALING', {'NUMBER': number})
  }

  /**
   * Get hfp radio state.
   * @returns {RADIO_STATE} - The current radio state.
   */
  getRadioState () {
    if (this.lastMsg.hfpstate === 'opened') {
      return protocol.RADIO_STATE.ON
    } else {
      return protocol.RADIO_STATE.OFF
    }
  }

  /**
   * Get hfp connection state.
   * @return {CONNECTION_STATE} - The current connection state.
   */
  getConnectionState () {
    if (this.lastMsg.connect_state === 'connected') {
      return protocol.CONNECTION_STATE.CONNECTED
    } else {
      return protocol.CONNECTION_STATE.DISCONNECTED
    }
  }

  /**
   * Get hfp call state.
   * @return {CALL_STATE} - The current call state.
   */
  getCallState () {
    if (this.lastMsg.call === 'active' ||
      this.lastMsg.setup === 'outgoing' ||
      this.lastMsg.setup === 'alerting') {
      return protocol.CALL_STATE.OFFHOOK
    } else if (this.lastMsg.setup === 'incoming') {
      return protocol.CALL_STATE.INCOMING
    } else {
      return protocol.CALL_STATE.IDLE
    }
  }

  /**
   * Get hfp discovery state.
   * @return {DISCOVERY_STATE} - The currenct discovery state.
   */
  getDiscoveryState () {
    return protocol.DISCOVERY_STATE.OFF
  }

  /**
   * Get if bluetooth is opened.
   * @returns {boolean} - `true` if bluetooth is opened else `false`.
   */
  isOpened () {
    return this.lastMsg.hfpstate === 'opened'
  }

  /**
   * Get if this device is connected with remote device.
   * @returns {boolean} - `true` if blueooth is connected with remote device else `false`.
   */
  isConnected () {
    return this.lastMsg.connect_state === 'connected'
  }

  /**
   * @typedef {object} BluetoothDevice
   * @property {string} name - The device's name.
   * @property {string} address - The device's MAC address.
   */

  /**
   * Get connected bluetooth device.
   * @returns {BluetoothDevice|null} - Current connected bluetooth device object or `null` if no connected device.
   */
  getConnectedDevice () {
    if (!this.isConnected()) {
      return null
    } else {
      return {
        address: this.lastMsg.connect_address,
        name: this.lastMsg.connect_name
      }
    }
  }

  /**
   * Get if is calling.
   * @returns {boolean} - `true` if is calling else `false`.
   */
  isCalling () {
    return this.lastMsg.call === 'active'
  }

  /**
   * Get if is incoming a call.
   * @returns {boolean} - `true` if is incoming a call else `false`.
   */
  isIncoming () {
    return this.lastMsg.setup === 'incoming'
  }

  /**
   * Get if is outgoing a call.
   * @returns {boolean} - `true` if is outgoing a call else `false`.
   */
  isOutgoing () {
    return this.lastMsg.setup === 'outgoing'
  }

  /**
   * Destroy bluetooth profile adapter.
   */
  destroy () {
    logger.debug(`destroy()`)
    this.removeAllListeners()
    this._flora.deinit()
    this._end = true
  }
}

exports.BluetoothHfp = BluetoothHfp
