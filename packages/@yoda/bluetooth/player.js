'use strict'

var logger = require('logger')('bluetooth-sink')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')
var helper = require('./helper')
var AudioManager = require('@yoda/audio').AudioManager

var lastMsg = {
  'a2dpstate': 'closed',
  'connect_state': 'invalid',
  'connect_address': null,
  'connect_name': null,
  'play_state': 'invalid',
  'broadcast_state': 'closed',
  'linknum': 0
}
var lastCmd

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
  this._flora.init('bluetooth-a2dpsink', {
    'uri': 'unix:/var/run/flora.sock',
    'bufsize': 40960,
    'reconnInterval': 10000
  })
}
inherits(BluetoothPlayer, EventEmitter)

/**
 * @private
 */
BluetoothPlayer.prototype._onevent = function (data) {
  try {
    var msg = JSON.parse(data[0] + '')
    logger.debug(`on event(action:${msg.action})`)

    if (msg.action === 'stateupdate') {
      logger.debug(`a2dp:${lastMsg.a2dpstate}=>${msg.a2dpstate}, conn:${lastMsg.connect_state}=>${msg.connect_state}, play:${lastMsg.play_state}=>${msg.play_state}, bc:${lastMsg.broadcast_state}=>${msg.broadcast_state}`)
      if (msg.a2dpstate === lastMsg.a2dpstate && msg.connect_state === lastMsg.connect_state && msg.play_state === lastMsg.play_state && msg.broadcast_state === lastMsg.broadcast_state) {
        logger.warn('Ignore useless msg!')
      }

      if (msg.a2dpstate === 'opened' && msg.connect_state === 'invalid' && msg.play_state === 'invalid') {
        this.emit('opened', msg.linknum > 0)
      } else if (msg.a2dpstate === 'open failed' && msg.connect_state === 'invalid' && msg.play_state === 'invalid') {
        this.emit('open failed')
      } else if (msg.a2dpstate === 'closed') {
        this.emit('closed')
      } else if (msg.a2dpstate === 'opened' && msg.connect_state === 'connected') {
        if (msg.play_state === 'invalid') {
          var connectedDevice = {'address': msg.connect_address, 'name': msg.connect_name}
          this.emit('connected', connectedDevice)
        } else if (msg.play_state === 'played') {
          this.emit('played')
        } else if (msg.play_state === 'stopped') {
          if (lastCmd === 'pause') {
            this.emit('paused')
          } else {
            this.emit('stopped')
          }
          lastCmd = null
        }
      } else if (msg.a2dpstate === 'opened' && msg.connect_state === 'disconnected') {
        this.emit('disconnected')
      }

      if (msg.a2dpstate === 'opened' && msg.connect_state === 'invalid' && msg.play_state === 'invalid' && msg.broadcast_state === 'opened') {
        this.emit('discoverable')
      } else if (msg.broadcast_state === 'closed' && lastMsg.broadcast_state === 'opened') {
        this.emit('undiscoverable')
      }
      lastMsg = Object.assign(lastMsg, msg)
    } else if (msg.action === 'volumechange') {
      var vol = msg.value
      if (vol === undefined) {
        vol = AudioManager.getVolume(AudioManager.STREAM_PLAYBACK)
      }
      AudioManager.setVolume(vol)
      logger.info(`Set volume ${vol} for bluetooth a2dp sink.`)
      return this.emit('volume changed', vol)
    }
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
  var msg = [ JSON.stringify(data) ]

  if (cmdstr === 'ON') {
    return this._flora.post('bluetooth.a2dpsink.command', msg, floraFactory.MSGTYPE_PERSIST)
  } else {
    return this._flora.post('bluetooth.a2dpsink.command', msg, floraFactory.MSGTYPE_INSTANT)
  }
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
BluetoothPlayer.prototype.open = function open (name, autoplay) {
  logger.debug(`open(autoplay:${autoplay})`)
  if (lastMsg.a2dpstate === 'opened') {
    logger.warn('open() while last state is already opened.')
  }
  if (autoplay) {
    return this._send('ON', {name: name, unique: true, subsequent: 'PLAY'})
  } else {
    return this._send('ON', {name: name, unique: true})
  }
}

/**
 * End the bluetooth player.
 * @returns {null}
 */
BluetoothPlayer.prototype.close = function close () {
  logger.debug(`close(cur state: ${lastMsg.a2dpstate})`)
  if (lastMsg.a2dpstate === 'closed') {
    logger.warn('close() while last state is already closed.')
  }
  this._send('OFF')
}
BluetoothPlayer.prototype.end = function end () {
  this.close()
}

/**
 * Connect to devices
 */
BluetoothPlayer.prototype.connect = function connectTo (addr, name) {
  logger.warn('connect() is not supported for SINK!')
  process.nextTick(() => {
    return this.emit('connect failed')
  })
}

/**
 * Disconnect from device
 */
BluetoothPlayer.prototype.disconnect = function disconnectFrom () {
  logger.debug('disconnect()')
  if (lastMsg.connect_state !== 'connected') {
    logger.warn('disconnect() while last state is not connected.')
  }
  return this._send('DISCONNECT_PEER')
}

/**
 * Suspend the Bluetooth player, this pauses the current audio stream on
 * bluetooth service util `resume()` gets called. This commonly is used
 * when the device is awaken, system needs the bluetooth player suspends,
 * and listenning the user.
 */
BluetoothPlayer.prototype.mute = function mute () {
  return this._send('MUTE')
}

/**
 * Resume from the `suspend` state.
 */
BluetoothPlayer.prototype.unmute = function unmute () {
  return this._send('UNMUTE')
}

/**
 * Play the music.
 * @returns {null}
 */
BluetoothPlayer.prototype.start = function start () {
  logger.debug(`start(play_state = ${lastMsg.play_state})`)
  if (lastMsg.play_state === 'played') {
    // Yet still try send 'PLAY' cmd.
    logger.warn('start() while last state is already played.')
  }
  this.unmute()
  return this._send('PLAY')
}

/**
 * Stop the music.
 * @returns {null}
 */
BluetoothPlayer.prototype.stop = function stop () {
  logger.debug(`stop(play_state = ${lastMsg.play_state})`)
  if (lastMsg.play_state === 'stopped') {
    // Yet still try send 'STOP' cmd.
    logger.warn('stop() while last state is already stopped.')
  }
  return this._send('STOP')
}

/**
 * Pause the music.
 * @returns {null}
 */
BluetoothPlayer.prototype.pause = function pause () {
  logger.debug(`pause(play_state = ${lastMsg.play_state})`)
  if (lastMsg.play_state === 'stopped') {
    // Yet still try send 'PAUSE' cmd.
    logger.warn('pause() while last state is already stopped.')
  }
  lastCmd = 'pause'
  return this._send('PAUSE')
}

/**
 * Play previous music.
 * @returns {null}
 */
BluetoothPlayer.prototype.prev = function prev () {
  return this._send('PREV')
}

/**
 * Play next music.
 * @returns {null}
 */
BluetoothPlayer.prototype.next = function next () {
  return this._send('NEXT')
}

/**
 * Some status query functions.
 */
BluetoothPlayer.prototype.isOpened = function isOpened () {
  return lastMsg.a2dpstate === 'opened'
}

BluetoothPlayer.prototype.isConnected = function isConnected () {
  return lastMsg.connect_state === 'connected'
}

BluetoothPlayer.prototype.getConnectedDevice = function getConnectedDevice () {
  return {address: lastMsg.connect_address, name: lastMsg.connect_name}
}

BluetoothPlayer.prototype.isPlaying = function isPlaying () {
  return lastMsg.play_state === 'played'
}

BluetoothPlayer.prototype.isDiscoverable = function isDiscoverable () {
  return lastMsg.broadcast_state === 'opened'
}

/**
 * Disconnect the event socket, this is deprecated please use `.destroyConnection()`
 * instead.
 */
BluetoothPlayer.prototype.disconnectConnection = function disconnectConnection () {
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
