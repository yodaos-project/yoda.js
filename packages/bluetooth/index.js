'use strict'

/**
 * @module bluetooth
 * @private
 * @description The YodaOS includes support for the Bluetooth network
 * stack, which allows a device to wirelessly exchange data with other
 * Bluetooth devices. Using the Bluetooth APIs, your application can
 * perform the followings:
 *
 * - Scan for other devices.
 * - Control Bluetooth playback.
 * - Transfer data to and from other devices.
 */

var Bluetooth = require('./bluetooth.node').Bluetooth
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var globalAgent = null

// sink commands
var A2DP_SINK_CMD = {
  play: 1,
  stop: 2,
  pause: 3,
  forward: 4,
  backward: 5
}

/**
 * @constructor
 * @private
 * @param {String} [name=yoda] - the device name
 * @fires bluetooth.BluetoothAgent#ble open
 * @fires bluetooth.BluetoothAgent#ble close
 * @fires bluetooth.BluetoothAgent#ble data
 */
function BluetoothAgent (name) {
  EventEmitter.call(this)
  this._name = name || 'yoda'
  this._player = null
  this._handle = new Bluetooth(this._name)
  this._handle.onevent = this.onevent.bind(this)
  this._handle.ondiscovery = this.ondiscovery.bind(this)
}
inherits(BluetoothAgent, EventEmitter)

/**
 * onevent
 * @private
 */
BluetoothAgent.prototype.onevent = function (what, arg1, arg2, data) {
  if (what === Bluetooth.BT_EVENT_A2DP_OPEN) {
    /**
     * a2dp open event
     * @event bluetooth.BluetoothAgent#a2dp open
     */
    this.emit('a2dp open')
  } else if (what === Bluetooth.BT_EVENT_A2DP_CLOSE) {
    /**
     * a2dp close event
     * @event bluetooth.BluetoothAgent#a2dp close
     */
    this.emit('a2dp close')
  } else if (what === Bluetooth.BT_EVENT_A2DP_START) {
    /**
     * a2dp start event
     * @event bluetooth.BluetoothAgent#a2dp start
     */
    this.emit('a2dp start')
  } else if (what === Bluetooth.BT_EVENT_A2DP_STOP) {
    /**
     * a2dp stop event
     * @event bluetooth.BluetoothAgent#a2dp stop
     */
    this.emit('a2dp stop')
  } else if (what === Bluetooth.BT_EVENT_AVK_OPEN) {
    /**
     * avk open event
     * @event bluetooth.BluetoothAgent#avk open
     */
    this.emit('avk open')
  } else if (what === Bluetooth.BT_EVENT_AVK_CLOSE) {
    /**
     * avk close event
     * @event bluetooth.BluetoothAgent#avk close
     */
    this.emit('avk close')
  } else if (what === Bluetooth.BT_EVENT_AVK_RC_OPEN) {
    /**
     * avk open event from remote channel
     * @event bluetooth.BluetoothAgent#avk close
     */
    this.emit('avk rc open')
  } else if (what === Bluetooth.BT_EVENT_AVK_RC_CLOSE) {
    /**
     * avk close event from remote channel
     * @event bluetooth.BluetoothAgent#avk close
     */
    this.emit('avk rc close')
  } else if (what === Bluetooth.BT_EVENT_AVK_START) {
    /**
     * avk close event
     * @event bluetooth.BluetoothAgent#avk close
     */
    this.emit('avk start')
  } else if (what === Bluetooth.BT_EVENT_AVK_PAUSE) {
    /**
     * avk pause event
     * @event bluetooth.BluetoothAgent#avk pause
     */
    this.emit('avk pause')
  } else if (what === Bluetooth.BT_EVENT_AVK_STOP) {
    /**
     * avk close event
     * @event bluetooth.BluetoothAgent#avk stop
     */
    this.emit('avk stop')
  } else if (what === Bluetooth.BT_EVENT_AVK_GET_PLAY_STATUS) {
    /**
     * avk state event
     * @event bluetooth.BluetoothAgent#avk state
     */
    this.emit('avk state', arg1, arg2)
  } else if (what === Bluetooth.BT_EVENT_BLE_OPEN) {
    /**
     * ble open event
     * @event bluetooth.BluetoothAgent#ble open
     */
    this.emit('ble open')
  } else if (what === Bluetooth.BT_EVENT_BLE_CLOSE) {
    /**
     * ble close event
     * @event bluetooth.BluetoothAgent#ble close
     */
    this.emit('ble close')
  } else if (what === Bluetooth.BT_EVENT_BLE_WRITE) {
    /**
     * ble data event
     * @event bluetooth.BluetoothAgent#ble data
     * @type {Object}
     * @property {Number} protocol - the procotol.
     * @property {String} data - the transfering data.
     * @property {bluetooth.BluetoothLowEnergyWritable} writable - the writable to write data.
     */
    this.emit('ble data', {
      protocol: arg1,
      data: data,
      writable: new BluetoothLowEnergyWritable(this, arg1)
    })
  } else {
    console.error(`unhandled event type ${what}`)
  }
}

/**
 * ondiscovery
 * @private
 */
BluetoothAgent.prototype.ondiscovery = function () {
  // TODO
}

/**
 * enable the given bluetooth module
 * @param {String} name - the bluetooth module name, like "ble", "a2dp".
 * @example
 * var bt = require('bluetooth').getBluetooth('mydevice')
 * bt.enable('ble')
 * bt.on('ble data', (message) => {
 *   console.log(message.protocol, message.data)
 * })
 */
BluetoothAgent.prototype.enable = function (name) {
  if (name === 'ble') {
    this._handle.enableBle()
  } else if (name === 'a2dp') {
    this._handle.enableA2dp()
  } else if (name === 'a2dp sink') {
    this._handle.enableA2dp(true)
  } else {
    this.emit('error', new Error(`bluetooth module ${name} not support`))
  }
}

/**
 * disable
 * @param {String} name - the bluetooth module name, like "ble", "a2dp".
 */
BluetoothAgent.prototype.disable = function (name) {
  if (name === 'ble') {
    this._handle.disableBle()
  } else if (name === 'a2dp') {
    this._handle.disableA2dp()
  } else if (name === 'a2dp sink') {
    this._handle.disableA2dp(true)
  } else {
    this.emit('error', new Error(`bluetooth module ${name} not support`))
  }
}

/**
 * setName
 * @param {String} val
 */
BluetoothAgent.prototype.setName = function (val) {
  this._handle.setName(val)
}

/**
 * get the default player, only works when enable "a2dp sink"
 * @returns {bluetooth.BluetoothPlayer}
 */
BluetoothAgent.prototype.createPlayer = function () {
  if (!this._player) {
    this._player = new BluetoothPlayer(this)
  }
  this._player.connect()
  return this._player
}

/**
 * @property {Object} enabled
 * @readable
 */
Object.defineProperty(BluetoothAgent.prototype, 'enabled', {
  get: function () {
    return {
      ble: this._handle.bleEnabledGetter()
    }
  }
})

/**
 * @private
 * @constructor
 * @augments EventEmitter
 * @param {bluetooth.BluetoothAgent} agent
 * @fires bluetooth.BluetoothPlayer#open
 * @fires bluetooth.BluetoothPlayer#close
 * @fires bluetooth.BluetoothPlayer#start
 * @fires bluetooth.BluetoothPlayer#pause
 * @fires bluetooth.BluetoothPlayer#stop
 * @example
 * var bt = require('bluetooth').getBluetooth('mydevice')
 * var player = bt.createPlayer()
 * player.on('start', () => {
 *   player.play()
 * })
 * player.on('stop', () => {
 *   player.disconnect()
 * })
 */
function BluetoothPlayer (agent) {
  this._agent = agent
  this._isOpened = false
  this._isRemoteOpened = false
  this._gettingState = null
  this._playingState = null
  if (!(this._agent instanceof BluetoothAgent)) { throw new TypeError('agent must be an instance of BluetoothAgent') }

  this._agent.enable('a2dp sink')
  this._agent.on('avk open', () => {
    this.isOpened = true
  })
  this._agent.on('avk close', () => {
    this._isOpened = false
    this._isRemoteOpened = false
  })
  this._agent.on('avk rc open', () => {
    this._isOpened = true
    this._isRemoteOpened = true
    /**
     * player is opened
     * @event bluetooth.BluetoothPlayer#open
     */
    this.emit('open')
  })
  this._agent.on('avk rc close', () => {
    this._isRemoteOpened = false
    this._gettingState = null
    this._playingState = null
    /**
     * player is closed
     * @event bluetooth.BluetoothPlayer#close
     */
    this.emit('close')
  })
  this._agent.on('avk start', () => {
    this._playingState = 'start'
    /**
     * player is starting
     * @event bluetooth.BluetoothPlayer#start
     */
    this.emit('start')
  })
  this._agent.on('avk pause', () => {
    this._playingState = 'pause'
    /**
     * player is paused
     * @event bluetooth.BluetoothPlayer#pause
     */
    this.emit('pause')
  })
  this._agent.on('avk stop', () => {
    this._playingState = 'stop'
    /**
     * player is stoped
     * @event bluetooth.BluetoothPlayer#stop
     */
    this.emit('stop')
  })
}
inherits(BluetoothPlayer, EventEmitter)

/**
 * connect the a2dp sink
 */
BluetoothPlayer.prototype.connect = function connect () {
  return this._agent.enable('a2dp sink')
}

/**
 * disconnect the a2dp sink
 */
BluetoothPlayer.prototype.disconnect = function connect () {
  return this._agent.disable('a2dp sink')
}

/**
 * play the music
 */
BluetoothPlayer.prototype.play = function play () {
  return this._agent._handle.sendCommand(A2DP_SINK_CMD.play)
}

/**
 * pause the music
 */
BluetoothPlayer.prototype.pause = function pause () {
  return this._agent._handle.sendCommand(A2DP_SINK_CMD.pause)
}

/**
 * stop the music
 */
BluetoothPlayer.prototype.stop = function stop () {
  return this._agent._handle.sendCommand(A2DP_SINK_CMD.stop)
}

/**
 * play next
 */
BluetoothPlayer.prototype.forward = function forward () {
  return this._agent._handle.sendCommand(A2DP_SINK_CMD.forward)
}

/**
 * play previous
 */
BluetoothPlayer.prototype.backward = function backward () {
  return this._agent._handle.sendCommand(A2DP_SINK_CMD.backward)
}

/**
 * get the local state
 */
BluetoothPlayer.prototype.getLocalPlaying = function getLocalPlaying () {
  return this._playingState
}

/**
 * get the remote state
 * @param {Function} cb - the remote playing state callback.
 * @throws {TypeError} remote state callback should be a function.
 * @throws {Error} still getting state.
 */
BluetoothPlayer.prototype.getRemotePlaying = function getRemotePlaying (cb) {
  if (typeof cb !== 'function') { throw new TypeError('remote state callback should be a function') }
  if (this._gettingState) { throw new Error('still getting state') }

  this._gettingState = true
  this._agent._handle.getAvkState()
  this._agent.once('avk state', (arg1, arg2) => {
    if (!this._isRemoteOpened) {
      // if the remote closed, just skip
      return cb(new Error('player has been closed'))
    }
    this._gettingState = false
    if (arg1 === 0) {
      this._playingState = 'stop'
    } else if (arg1 === 1) {
      this._playingState = 'start'
    } else if (arg1 === 2) {
      this._playingState = 'pause'
    } else {
      return cb(new Error('unknown state'))
    }
    cb(null, this._playingState)
  })
}

/**
 * @constructor
 * @param {bluetooth.BluetoothAgent} agent
 * @param {Number} uuid
 */
function BluetoothLowEnergyWritable (agent, uuid) {
  this._agent = agent
  this._uuid = uuid
}

/**
 * write the data to the specified ble uuid.
 * @param {Object|String} message - the data to write.
 */
BluetoothLowEnergyWritable.prototype.write = function (message) {
  if (typeof message !== 'string') {
    message = JSON.stringify(message)
  }
  return this._agent._handle.bleWrite(this._uuid, message)
}

/**
 * get the uuid.
 * @returns {Number} the uuid number.
 */
BluetoothLowEnergyWritable.prototype.getUuid = function () {
  return this._uuid
}

/**
 * @method getBluetooth
 * @param {String} [name=yoda] - the device name
 * @returns {bluetooth.BluetoothAgent}
 */
exports.getBluetooth = function getBluetooth (name) {
  if (!globalAgent) {
    globalAgent = new BluetoothAgent(name)
  }
  return globalAgent
}
