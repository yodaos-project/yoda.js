'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var AudioManager = require('@yoda/audio')
var helper = require('./helper')
var a2dpsinkPath = `ipc://${helper.CHANNEL_PREFIX}/a2dpsink_event`

/**
 * Use `bluetooth.getPlayer()` instead of this constructor.
 * @class
 * @augments EventEmitter
 * @memberof module:@yoda/bluetooth
 */
function BluetoothPlayer () {
  EventEmitter.call(this)
  this._end = false
  this._cmdSocket = helper.getCmdSocket()
  this._eventSocket = helper.getSocket(a2dpsinkPath)
  this._eventSocket.on('message', (buffer) => {
    try {
      if (this._end) {
        return
      }

      var msg = JSON.parse(buffer + '')
      if (msg.action === 'volumechange') {
        AudioManager.setVolume(AudioManager.STREAM_PLAYBACK, msg.value)
        /**
         * When the volume needs to be changed from bluetooth service.
         * @event module:@yoda/bluetooth.BluetoothPlayer#opened
         */
        return this.emit('volumechange', msg)
      }
      // only if the connect_state && play_state is invalid, mapped as `opened`.
      if (msg.a2dpstate === 'opened' &&
        msg.connect_state === 'invalid' &&
        msg.play_state === 'invalid') {
        /**
         * When the bluetooth(a2dp) is opened.
         * @event module:@yoda/bluetooth.BluetoothPlayer#opened
         */
        this.emit('opened')
      } else if (msg.a2dpstate === 'closed') {
        /**
         * When the bluetooth(a2dp) is closed.
         * @event module:@yoda/bluetooth.BluetoothPlayer#closed
         */
        this.emit('closed')
      }
      /**
       * When play state updates.
       * @event module:@yoda/bluetooth.BluetoothPlayer#stateupdate
       * @type {object}
       * @property {string} a2dpstate - the a2dp state
       * @property {string} connect_state - if the connect
       * @property {string} connect_name - the connected device name
       * @property {string} play_state - the state of playing on the peer device
       */
      this.emit('stateupdate', msg)
    } catch (err) {
      /**
       * When something is wrong.
       * @event module:@yoda/bluetooth.BluetoothPlayer#error
       * @type {Error}
       */
      this.emit('error', err)
    }
  })
}
inherits(BluetoothPlayer, EventEmitter)

/**
 * @private
 */
BluetoothPlayer.prototype._send = function (cmdstr, name) {
  return this._cmdSocket.send(JSON.stringify({
    proto: 'A2DPSINK',
    command: cmdstr,
    name: name
  }))
}

/**
 * Start the bluetooth player.
 * @param {string} name - the bluetooth name.
 * @param {boolean} always - if true, always start until success.
 * @param {function} onerror
 * @returns {Null}
 */
BluetoothPlayer.prototype.start = function start (name, always, onerror) {
  if (always) {
    helper.startWithRetry(name, this, onerror, 20)
  } else {
    this._end = false
    this._send('ON', name)
  }
}

/**
 * End the bluetooth player.
 * @returns {Null}
 */
BluetoothPlayer.prototype.end = function () {
  this._end = true
  process.nextTick(() => this._send('OFF'))
}

/**
 * Play the music.
 * @returns {Null}
 */
BluetoothPlayer.prototype.play = function () {
  return this._send('PLAY')
}

/**
 * Stop the music.
 * @returns {Null}
 */
BluetoothPlayer.prototype.stop = function () {
  return this._send('STOP')
}

/**
 * Pause the music.
 * @returns {Null}
 */
BluetoothPlayer.prototype.pause = function () {
  return this._send('PAUSE')
}

/**
 * Play next music.
 * @returns {Null}
 */
BluetoothPlayer.prototype.next = function () {
  return this._send('NEXT')
}

/**
 * Play previous music.
 * @returns {Null}
 */
BluetoothPlayer.prototype.prev = function () {
  return this._send('PREV')
}

/**
 * disconnect the event socket
 */
BluetoothPlayer.prototype.disconnect = function disconnect () {
  return helper.disconnectAfterClose(this, 2000)
}

exports.BluetoothPlayer = BluetoothPlayer
