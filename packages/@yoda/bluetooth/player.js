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
      AudioManager.setVolume(vol)
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
 * Starts the bluetooth player, it starts the `a2dp-sink`, and waits for the connection
 * from a peer.
 *
 * You should listens the following events:
 * - `opened` when the `a2dp-sink` is opened.
 * - `closed` when the `a2dp-sink` is closed.
 * - `stateupdate` when any of states updates.
 * - `error` when something went wrong from bluetooth service.
 *
 * @param {string} name - the bluetooth name.
 * @param {string} subsequent - the subsequent command.
 * @param {function} cb
 * @returns {null}
 * @fires module:@yoda/bluetooth.BluetoothPlayer#opened
 * @fires module:@yoda/bluetooth.BluetoothPlayer#closed
 * @fires module:@yoda/bluetooth.BluetoothPlayer#stateupdate
 * @fires module:@yoda/bluetooth.BluetoothPlayer#error
 * @example
 * var player = require('@yoda/bluetooth').getPlayer()
 * player.on('opened', () => {
 *   console.log('bluetooth has been opened')
 * })
 * player.start('YodaOS Bluetooth')
 *
 */
BluetoothPlayer.prototype.start = function start (name, subsequent, cb) {
  this._end = false
  if (typeof cb === 'function') {
    this.once('opened', cb)
  }
  this.resume()
  return this._send('ON', {
    name: name,
    unique: true,
    subsequent: subsequent
  })
}

/**
 * End the bluetooth player.
 * @returns {null}
 */
BluetoothPlayer.prototype.end = function end () {
  this.once('closed', () => {
    this._end = true
  })
  process.nextTick(() => this._send('OFF'))
}

/**
 * Suspend the Bluetooth player, this pauses the current audio stream on
 * bluetooth service util `resume()` gets called. This commonly is used
 * when the device is awaken, system needs the bluetooth player suspends,
 * and listenning the user.
 */
BluetoothPlayer.prototype.suspend = function suspend () {
  return this._send('MUTE')
}

/**
 * Resume from the `suspend` state.
 */
BluetoothPlayer.prototype.resume = function resume () {
  return this._send('UNMUTE')
}

/**
 * Play the music.
 * @returns {null}
 */
BluetoothPlayer.prototype.play = function play () {
  this.resume()
  return this._send('PLAY')
}

/**
 * Stop the music.
 * @returns {null}
 */
BluetoothPlayer.prototype.stop = function stop () {
  return this._send('STOP')
}

/**
 * Pause the music.
 * @returns {null}
 */
BluetoothPlayer.prototype.pause = function pause () {
  return this._send('PAUSE')
}

/**
 * Play next music.
 * @returns {null}
 */
BluetoothPlayer.prototype.next = function next () {
  this.resume()
  return this._send('NEXT')
}

/**
 * Play previous music.
 * @returns {null}
 */
BluetoothPlayer.prototype.prev = function prev () {
  this.resume()
  return this._send('PREV')
}

/**
 * Disconnect from device
 */
BluetoothPlayer.prototype.disconnectPeer = function disconnectDevice () {
  return this._send('DISCONNECT_PEER')
}

/**
 * Disconnect the event socket, this is deprecated please use `.destroyConnection()`
 * instead.
 */
BluetoothPlayer.prototype.disconnect = function disconnect () {
  return helper.disconnectAfterClose(this, 2000)
}

/**
 * Destroy the connection to bluetooth service, this firstly sends the OFF command
 * and destroy the connection.
 */
BluetoothPlayer.prototype.destroyConnection = function destroyConnection () {
  return helper.disconnectAfterClose(this, 2000)
}

exports.BluetoothPlayer = BluetoothPlayer
