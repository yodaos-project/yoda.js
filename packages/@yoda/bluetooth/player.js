'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
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
      /**
       * When play state updates.
       * @event module:@yoda/bluetooth.BluetoothPlayer#stateupdate
       * @type {Object}
       * @property {String} a2dpstate - the a2dp state
       * @property {String} connect_state - if the connect
       * @property {String} connect_name - the connected device name
       * @property {String} play_state - the state of playing on the peer device
       */
      var msg = JSON.parse(buffer + '')
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
 * @param {String} name - the bluetooth name.
 * @returns {Null}
 */
BluetoothPlayer.prototype.start = function start (name) {
  this._end = false
  return this._send('ON', name)
}

/**
 * End the bluetooth player.
 * @returns {Null}
 */
BluetoothPlayer.prototype.end = function () {
  this._end = true
  return this._send('OFF')
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
  this.end()
  process.nextTick(() => {
    this._eventSocket.close()
  })
}

exports.BluetoothPlayer = BluetoothPlayer
