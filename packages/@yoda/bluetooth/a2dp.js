'use strict'

var logger = require('logger')('bluetooth-a2dp')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')
var protocol = require('./protocol.json')
var AudioManager = require('@yoda/audio').AudioManager
var _ = require('@yoda/util')._
var stateFilters = require('./a2dp-statemap').stateFilters

/**
 * @typedef {object} PROFILE
 * @property {string} BLE - Bluetooth low energy profile.
 * @property {string} A2DP - Bluetooth advanced audio distribution profile.
 */

/**
 * @typedef {object} A2DP_MODE
 * @property {string} SINK - A2dp sink mode.
 * @property {string} SOURCE - A2dp source mode.
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
 * @typedef {object} AUDIO_STATE
 * @property {string} PLAYING - Music stream is playing.
 * @property {string} PAUSED - Music stream is paused.
 * @property {string} STOPPED - Music stream is stopped.
 * @property {string} VOLUMN_CHANGED - Music stream's volumn is changed.
 */

/**
 * @typedef {object} DISCOVERY_STATE
 * @property {string} ON - Local device is discoverable.
 * @property {string} OFF - Local device is undiscoverable.
 * @property {string} DEVICE_LIST_CHANGED - Found new around bluetooth devices.
 */

/**
 * When bluetooth's radio state is changed, such as on/off.
 * @event module:@yoda/bluetooth.BluetoothA2dp#radio_state_changed
 */

/**
 * When bluetooth's connection state is changed, such as connected/disconnected.
 * @event module:@yoda/bluetooth.BluetoothA2dp#connection_state_changed
 */

/**
 * When bluetooth's audio stream state is changed, such as playing/paused.
 * @event module:@yoda/bluetooth.BluetoothA2dp#audio_state_changed
 */

/**
 * When bluetooth's discovery state is changed, such as undiscoverable or device list changed.
 * @event module:@yoda/bluetooth.BluetoothA2dp#discovery_state_changed
 */

/**
 * Use `bluetooth.getAdapter(PROFILE.A2DP)` instead of this constructor.
 * @memberof module:@yoda/bluetooth
 * @constructor
 * @extends EventEmitter
 * @param {string} deviceName - The device name.
 */
function BluetoothA2dp (deviceName) {
  EventEmitter.call(this)

  this.lastMsg = {
    'a2dpstate': 'closed',
    'connect_state': 'invalid',
    'connect_address': null,
    'connect_name': null,
    'play_state': 'invalid',
    'broadcast_state': 'closed',
    'linknum': 0
  }
  this._end = false
  this.lastMode = protocol.A2DP_MODE.SINK // last used a2dp mode
  this.localName = deviceName // local bluetooth device name

  this._flora = new FloraComp(null, {
    'uri': 'unix:/var/run/flora.sock',
    'bufsize': 40960,
    'reconnInterval': 10000
  })
  this._flora.handlers = {
    'bluetooth.a2dpsink.event': this._onSinkEvent.bind(this),
    'bluetooth.a2dpsource.event': this._onSourceEvent.bind(this)
  }
  this._flora.init()
}
inherits(BluetoothA2dp, EventEmitter)

/**
 * @private
 */
BluetoothA2dp.prototype.matchState = function (msg, filter) {
  if (filter === undefined || filter === null) {
    return true
  }
  return (filter.a2dpstate === msg.a2dpstate || filter.a2dpstate === undefined) &&
    (filter.connect_state === msg.connect_state || filter.connect_state === undefined) &&
    (filter.play_state === msg.play_state || filter.play_state === undefined || msg.play_state === undefined) &&
    (filter.broadcast_state === msg.broadcast_state || filter.broadcast_state === undefined) &&
    (filter.mode === this.lastMode || filter.mode === undefined)
}

/**
 * @private
 */
BluetoothA2dp.prototype.handleEvent = function (data, mode) {
  if (this._end) {
    logger.warn(`${mode} Already destroied!`)
    return
  }
  try {
    var msg = JSON.parse(data[0] + '')
    logger.debug(`on ${mode} event(action:${msg.action})`)

    if (msg.action === 'stateupdate') {
      var last = this.lastMsg
      logger.debug(`last: ${last.a2dpstate} ${last.connect_state} ${last.play_state} ${last.broadcast_state}`)
      logger.debug(`now:  ${msg.a2dpstate} ${msg.connect_state} ${msg.play_state} ${msg.broadcast_state}`)
      if (this.matchState(msg, this.lastMsg)) {
        logger.warn(`Received ${mode} same msg!`)
      }
      var lastMessage = Object.assign({}, this.lastMsg)
      this.lastMsg = Object.assign(this.lastMsg, msg)
      var stateHit = false
      stateFilters.forEach((filter) => {
        if (this.matchState(msg, filter.inflowMsg) && this.matchState(lastMessage, filter.lastInflowMsg)) {
          var event = filter.outflowEvent
          logger.debug(`Match ${event.type}.${event.state}`)
          var generator = filter.extraDataGenerator
          if (generator === undefined || generator === null || typeof generator !== 'function') {
            this.emit(event.type, mode, event.state)
          } else {
            var extraData = generator(msg)
            this.emit(event.type, mode, event.state, extraData)
          }
          stateHit = true
        }
      })
      if (!stateHit) {
        logger.warn(`Mismatch state, please check state-mapping!`)
      }
    } else if (msg.action === 'volumechange') {
      var vol = msg.value
      if (vol === undefined) {
        vol = AudioManager.getVolume(AudioManager.STREAM_PLAYBACK)
      }
      AudioManager.setVolume(vol)
      logger.info(`Set volume ${vol} for bluetooth a2dp sink.`)
      this.emit('audio_state_changed', protocol.A2DP_MODE.SINK, protocol.AUDIO_STATE.VOLUMN_CHANGED, {volumn: vol})
    } else if (msg.action === 'discovery') {
      var results = msg.results
      var nbr = results.deviceList != null ? results.deviceList.length : 0
      logger.debug(`Found ${nbr} devices, is_comp: ${results.is_completed}, currentDevice: ${results.currentDevice}`)
      if (nbr > 0) {
        results.deviceList.forEach((device) => {
          logger.debug(`  ${device.name} : ${device.address}`)
        })
      }
      this.emit('discovery_state_changed', protocol.A2DP_MODE.SOURCE, protocol.DISCOVERY_STATE.DEVICE_LIST_CHANGED, results)
    } else if (msg.action === 'element_attrs') {
      var song = {
        title: msg.title,
        artist: msg.artist,
        album: msg.album
      }
      this.emit(`audio_state_changed`, protocol.A2DP_MODE.SINK, protocol.AUDIO_STATE.QUERY_RESULT, song)
    }
  } catch (err) {
    logger.error(`on ${mode} error(${JSON.stringify(err)})`)
  }
}

/**
 * @private
 */
BluetoothA2dp.prototype._onSinkEvent = function (data) {
  this.handleEvent(data, protocol.A2DP_MODE.SINK)
}

/**
 * @private
 */
BluetoothA2dp.prototype._onSourceEvent = function (data) {
  this.handleEvent(data, protocol.A2DP_MODE.SOURCE)
}

/**
 * @private
 */
BluetoothA2dp.prototype._send = function (mode, cmdstr, props) {
  var data = Object.assign({ command: cmdstr }, props)
  var msg = [ JSON.stringify(data) ]
  var name = (mode === protocol.A2DP_MODE.SINK ? 'bluetooth.a2dpsink.command' : 'bluetooth.a2dpsource.command')
  return this._flora.post(name, msg, floraFactory.MSGTYPE_INSTANT)
}

/**
 * Turn on the bluetooth. It will starts `a2dp-sink` or `a2dp-source` according parameter `mode`.
 *
 * You can listen following changed states:
 * - `protocol.RADIO_STATE.ON` when bluetooth is opened successfully.
 * - `protocol.RADIO_STATE.ON_FAILED` when bluetooth cannot be opened.
 * - `protocol.CONNECTION_STATE.AUTOCONNECT_FAILED` when bluetooth opened but auto connect to history paired device failed.
 *
 * @param {A2DP_MODE} [mode] - Specify the bluetooth a2dp profile mode. Default will starts `A2DP_MODE.SINK`.
 * @param {object} [options] - The extra options.
 * @param {boolean} [options.autoplay=false] - Whether after autoconnected, music should be played automatically.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#radio_state_changed
 * @fires module:@yoda/bluetooth/BluetoothA2dp#connection_state_changed
 * @example
 * var bluetooth = require('@yoda/bluetooth')
 * var protocol = bluetooth.protocol
 * var a2dp = bluetooth.getAdapter(protocol.PROFILE.A2DP)
 * a2dp.on('radio_state_changed', function (mode, state, extra) {
 *   console.log(`bluetooth mode: ${mode}, state: ${state}`)
 * })
 * a2dp.open(protocol.A2DP_MODE.SINK, {autoplay: true})
 */
BluetoothA2dp.prototype.open = function (mode, options) {
  if (mode === undefined) {
    mode = protocol.A2DP_MODE.SINK
  }
  var autoplay = _.get(options, 'autoplay', false)
  logger.debug(`open(${this.lastMode}=>${mode}, autoplay:${autoplay})`)
  this.lastMode = mode
  var msg = {
    name: this.localName,
    unique: true
  }
  if (autoplay) {
    msg.subsequent = 'PLAY'
  }
  if (mode === protocol.A2DP_MODE.SINK) {
    // Bluetooth phone call is binded with bluetooth music.
    msg.sec_pro = 'HFP'
  }
  this._send(mode, 'ON', msg)
}

/**
 * Turn off the bluetooth.
 *
 * You can listen following changed state events:
 * - `protocol.RADIO_STATE.OFF` when bluetooth is closed.
 *
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#radio_state_changed
 */
BluetoothA2dp.prototype.close = function () {
  logger.debug(`close(${this.lastMode}, ${this.lastMsg.a2dpstate})`)
  if (this.lastMsg.a2dpstate === 'closed') {
    logger.warn('close() while last state is already closed.')
  }
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    // Bluetooth phone call is binded with bluetooth music.
    this._send(this.lastMode, 'OFF', {sec_pro: 'HFP'})
  } else {
    this._send(this.lastMode, 'OFF')
  }
}

/**
 * Connect bluetooth to remote device.
 *
 * You can listen following changed states:
 * - `protocol.CONNECTION_STATE.CONNECTED` when successfully connected to remote device.
 * - `protocol.CONNECTION_STATE.CONNECT_FAILED` when cannot connect to remote device.
 * @param {string} addr - Specify the remote bluetooth device's MAC address.
 * @param {string} name - Specify the remote bluetooth device's name.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#connection_state_changed
 */
BluetoothA2dp.prototype.connect = function (addr, name) {
  logger.debug(`connect(${this.lastMode}, ${name}:${addr})`)
  if (this.lastMode === protocol.A2DP_MODE.SOURCE) {
    var target = {'address': addr, 'name': name}
    if (this.lastMsg.a2dpstate !== 'opened') {
      logger.warn('connect() while last state is not opened.')
    }
    if (this.lastMsg.connect_state === 'connected' && this.lastMsg.connect_address === addr) {
      logger.warn('connect() to same already connected device?')
    }
    this._send(this.lastMode, 'CONNECT', target)
  } else {
    logger.warn('connect() is not supported for SINK!')
    process.nextTick(() => {
      this.emit(protocol.STATE_CHANGED.CONNECTION, this.lastMode, protocol.CONNECTION_STATE.CONNECT_FAILED)
    })
  }
}

/**
 * Disconnect bluetooth from remote device.
 *
 * You can listen following changed state:
 * - `protocol.CONNECTION_STATE.DISCONNECTED` after disconnected from remote device.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#connection_state_changed
 */
BluetoothA2dp.prototype.disconnect = function () {
  logger.debug(`disconnect(${this.lastMode})`)
  if (this.lastMsg.connect_state !== 'connected') {
    logger.warn('disconnect() while last state is not connected.')
  }
  this._send(this.lastMode, 'DISCONNECT')
}

/**
 * Mute a2dp-sink music stream.
 *
 *  No state changed after this command execution.
 * @returns {null}
 */
BluetoothA2dp.prototype.mute = function () {
  logger.debug(`mute(${this.lastMode})`)
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    this._send(this.lastMode, 'MUTE')
  }
}

/**
 * Unmute a2dp-sink music stream.
 *
 * No state changed after this command execution.
 * @returns {null}
 */
BluetoothA2dp.prototype.unmute = function () {
  logger.debug(`unmute(${this.lastMode})`)
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    this._send(this.lastMode, 'UNMUTE')
  }
}

/**
 * Sync volume to remote device.
 *
 * @param {string} [vol] - the volume number to be synced.
 * @returns {null}
 */
BluetoothA2dp.prototype.syncVol = function (vol) {
  logger.debug(`sync volume(${vol})`)
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    this._send(this.lastMode, 'VOLUME', { value: vol })
  }
}

/**
 * Play a2dp-sink music stream.
 *
 * You can listen following changed state:
 * - `protocol.AUDIO_STATE.PLAYING` after music play started.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#audio_state_changed
 */
BluetoothA2dp.prototype.play = function () {
  logger.debug(`play(${this.lastMode}, play_state: ${this.lastMsg.play_state})`)
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    if (this.lastMsg.play_state === 'played') {
      logger.warn('play() while last state is already played.')
    }
    this._send(this.lastMode, 'UNMUTE')
    this._send(this.lastMode, 'PLAY')
  }
}

/**
 * Pause a2dp-sink music stream.
 *
 * You can listen following changed state:
 * - `protocol.AUDIO_STATE.PAUSED` after music play paused.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#audio_state_changed
 */
BluetoothA2dp.prototype.pause = function () {
  logger.debug(`pause(${this.lastMode}, play_state: ${this.lastMsg.play_state})`)
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    if (this.lastMsg.play_state === 'stopped') {
      logger.warn('pause() while last state is already stopped.')
    }
    this.lastCmd = 'pause'
    this._send(this.lastMode, 'MUTE')
    this._send(this.lastMode, 'PAUSE')
  }
}

/**
 * Stop a2dp-sink music stream.
 *
 * You can listen following changed state:
 * - `protocol.AUDIO_STATE.STOPPED` after music play stopped.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#audio_state_changed
 */
BluetoothA2dp.prototype.stop = function () {
  logger.debug(`stop(${this.lastMode}, play_state: ${this.lastMsg.play_state})`)
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    if (this.lastMsg.play_state === 'stopped') {
      logger.warn('stop() while last state is already stopped.')
    }
    this.lastCmd = 'stop'
    this._send(this.lastMode, 'STOP')
  }
}

/**
 * Play a2dp-sink previous song.
 *
 * No state changed after this command execution.
 * @returns {null}
 */
BluetoothA2dp.prototype.prev = function () {
  logger.debug(`prev(${this.lastMode})`)
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    this._send(this.lastMode, 'UNMUTE')
    this._send(this.lastMode, 'PREV')
  }
}

/**
 * Play a2dp-sink next song.
 *
 * No state changed after this command execution.
 * @returns {null}
 */
BluetoothA2dp.prototype.next = function () {
  logger.debug(`next(${this.lastMode})`)
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    this._send(this.lastMode, 'UNMUTE')
    this._send(this.lastMode, 'NEXT')
  }
}

/**
 * Query playing song's information such as album, title, artist, etc.
 *
 * You can listen following changed state:
 * - `protocol.AUDIO_STATE.QUERY_RESULT`.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#audio_state_changed
 */
BluetoothA2dp.prototype.query = function () {
  logger.debug(`query song info`)
  if (this.lastMode === protocol.A2DP_MODE.SINK) {
    this._send(this.lastMode, 'GETSONG_ATTRS')
  }
}

/**
 * Set local device discoverable.
 *
 * You can listen following changed state:
 * - `protocol.DISCOVER_STATE.ON` after set succeeded.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#discovery_state_changed
 * @private
 */
BluetoothA2dp.prototype.setDiscoverable = function () {
  logger.debug('Todo: not implemenet yet.')
}

/**
 * Set local device undiscoverable.
 *
 * You can listen following changed state:
 * - `protocol.DISCOVER_STATE.OFF` after set succeeded.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#discovery_state_changed
 * @private
 */
BluetoothA2dp.prototype.setUndiscoverable = function () {
  logger.debug('Todo: not implemenet yet.')
}

/**
 * Discovery around bluetooth devices.
 *
 * You can listen following changed state:
 * - `protocol.DISCOVER_STATE.DEVICE_LIST_CHANGED` while some bluetooth devices have been found.
 * @returns {null}
 * @fires module:@yoda/bluetooth/BluetoothA2dp#discovery_state_changed
 */
BluetoothA2dp.prototype.discovery = function () {
  logger.debug(`discovery(${this.lastMode}, cur state: ${this.lastMsg.a2dpstate})`)
  if (this.lastMode === protocol.A2DP_MODE.SOURCE) {
    if (this.lastMsg.a2dpstate !== 'opened') {
      logger.warn('discovery() while last state is not opened.')
    }
    this._send(this.lastMode, 'DISCOVERY')
  }
}

/**
 * Get current running A2DP profile mode.
 * @returns {A2DP_MODE} - The current running A2DP profile mode.
 */
BluetoothA2dp.prototype.getMode = function () {
  return this.lastMode
}

/**
 * Get a2dp radio state.
 * @returns {RADIO_STATE} - The current radio state.
 */
BluetoothA2dp.prototype.getRadioState = function () {
  if (this.lastMsg.a2dpstate === 'opened') {
    return protocol.RADIO_STATE.ON
  } else {
    return protocol.RADIO_STATE.OFF
  }
}

/**
 * Get a2dp connection state.
 * @return {CONNECTION_STATE} - The current connection state.
 */
BluetoothA2dp.prototype.getConnectionState = function () {
  if (this.lastMsg.connect_state === 'connected') {
    return protocol.CONNECTION_STATE.CONNECTED
  } else {
    return protocol.CONNECTION_STATE.DISCONNECTED
  }
}

/**
 * Get a2dp-sink audio state.
 * @return {AUDIO_STATE} - The current audio state.
 */
BluetoothA2dp.prototype.getAudioState = function () {
  if (this.lastMsg.play_state === 'played') {
    return protocol.AUDIO_STATE.PLAYING
  } else {
    return protocol.AUDIO_STATE.STOPPED
  }
}

/**
 * Get a2dp discovery state.
 * @return {DISCOVERY_STATE} - The currenct discovery state.
 */
BluetoothA2dp.prototype.getDiscoveryState = function () {
  if (this.lastMsg.broadcast_state === 'opened') {
    return protocol.DISCOVERY_STATE.ON
  } else {
    return protocol.DISCOVERY_STATE.OFF
  }
}

/**
 * Get if bluetooth is opened.
 * @returns {boolean} - `true` if bluetooth is opened else `false`.
 */
BluetoothA2dp.prototype.isOpened = function () {
  return this.lastMsg.a2dpstate === 'opened'
}

/**
 * Get if this device is connected with remote device.
 * @returns {boolean} - `true` if blueooth is connected with remote device else `false`.
 */
BluetoothA2dp.prototype.isConnected = function () {
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
BluetoothA2dp.prototype.getConnectedDevice = function () {
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
 * Get if a2dp-sink music is playing.
 * @returns {boolean} - `true` if bluetooth music is playing else `false`.
 */
BluetoothA2dp.prototype.isPlaying = function () {
  return this.lastMsg.play_state === 'played'
}

/**
 * Get if this deivce is under discoverable.
 * @returns {boolean} - `true` if local device is under discoverable else `false`.
 */
BluetoothA2dp.prototype.isDiscoverable = function () {
  return this.lastMsg.broadcast_state === 'opened'
}

/**
 * Destroy bluetooth profile adapter, thus means bluetooth will always be turned `OFF` automatically.
 */
BluetoothA2dp.prototype.destroy = function () {
  logger.debug(`destroy()`)
  this.removeAllListeners()
  this._flora.deinit()
  this._end = true
}

exports.BluetoothA2dp = BluetoothA2dp
