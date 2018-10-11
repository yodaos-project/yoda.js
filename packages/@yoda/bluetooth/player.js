'use strict'

var logger = require('logger')('bluetooth-player')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var AudioManager = require('@yoda/audio').AudioManager
var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')
var helper = require('./helper')

/**
 * Use `bluetooth.getPlayer()` instead of this constructor.
 * @class
 * @augments EventEmitter
 * @memberof module:@yoda/bluetooth
 */
function BluetoothPlayer () {
  EventEmitter.call(this)
  this._flora = new FloraComp(logger)
  this._flora.handlers = {
    'bluetooth.a2dpsink.event': this._onevent.bind(this)
  }
  this._flora.init('bluetooth-mediaplayer', {
    'uri': 'unix:/var/run/flora.sock',
    'bufsize': 40960,
    'reconnInterval': 10000
  })
  this._end = false
}
inherits(BluetoothPlayer, EventEmitter)

/**
 * @private
 */
BluetoothPlayer.prototype._onevent = function (data) {
  try {
    if (this._end) {
      logger.info('zmq connection has been closed, just skip the message')
      return
    }

    var msg = JSON.parse(data.get(0) + '')
    if (msg.action === 'volumechange') {
      var vol = msg.value
      if (vol === undefined) {
        vol = AudioManager.getVolume(AudioManager.STREAM_PLAYBACK)
      }
      AudioManager.setVolume(AudioManager.STREAM_PLAYBACK, vol)
      logger.info(`set volume ${vol} for bluetooth player`)
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
}

/**
 * @private
 */
BluetoothPlayer.prototype._send = function (cmdstr, props) {
  var data = Object.assign({ command: cmdstr }, props || {})
  var msg = new floraFactory.Caps()
  msg.write(JSON.stringify(data))
  return this._flora.post('bluetooth.a2dpsink.command', msg)
}

/**
 * Start the bluetooth player.
 * @param {string} name - the bluetooth name.
 * @param {string} subsequent - the subsequent command.
 * @param {function} cb
 * @returns {Null}
 */
BluetoothPlayer.prototype.start = function start (name, subsequent, cb) {
  this._end = false
  if (typeof cb === 'function') {
    this.once('opened', cb)
  }
  return this._send('ON', {
    name: name,
    subsequent: subsequent
  })
}

/**
 * End the bluetooth player.
 * @returns {Null}
 */
BluetoothPlayer.prototype.end = function () {
  this.once('closed', () => this._end = true)
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
