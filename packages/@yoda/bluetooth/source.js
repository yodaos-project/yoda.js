'use strict'

var logger = require('logger')('bluetooth-source')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var floraFactory = require('@yoda/flora')
var FloraComp = require('@yoda/flora/comp')
var helper = require('./helper')

var lastMsg = {
  'a2dpstate': 'closed',
  'connect_state': 'disconnected',
  'connect_address': null,
  'connect_name': null,
  'broadcast_state': 'closed',
  'linknum': 0
}

/**
 * Use `bluetooth.getSource()` instead of this constructor.
 * @class
 * @augments EventEmitter
 * @memberof module:@yoda/bluetooth
 */
function BluetoothSource () {
  EventEmitter.call(this)
  this._flora = new FloraComp(logger)
  this._flora.handlers = {
    'bluetooth.a2dpsource.event': this._onevent.bind(this)
  }
  this._flora.init('bluetooth-a2dpsource', {
    'uri': 'unix:/var/run/flora.sock',
    'bufsize': 40960,
    'reconnInterval': 10000
  })
}
inherits(BluetoothSource, EventEmitter)

/**
 * @private
 */
BluetoothSource.prototype._onevent = function (data) {
  try {
    var msg = JSON.parse(data[0] + '')
    logger.debug(`on event(action:${msg.action})`)

    if (msg.action === 'stateupdate') {
      logger.debug(`a2dp:${lastMsg.a2dpstate}=>${msg.a2dpstate}, conn:${lastMsg.connect_state}=>${msg.connect_state}, bc:${lastMsg.broadcast_state}=>${msg.broadcast_state}`)

      if (msg.a2dpstate === 'opened' && lastMsg.a2dpstate !== 'opened' && msg.connect_state === 'invalid') {
        this.emit('opened', msg.linknum > 0)
      } else if (msg.a2dpstate === 'open failed' && lastMsg.a2dpstate !== 'opened') {
        this.emit('open failed')
      } else if (msg.a2dpstate === 'closed' && lastMsg.a2dpstate === 'opened') {
        this.emit('closed')
      } else if (msg.a2dpstate === 'opened' && lastMsg.a2dpstate === 'opened' && msg.connect_state === 'connected' && lastMsg.connect_state !== 'connected') {
        var connectedDevice = {'address': msg.connect_address, 'name': msg.connect_name}
        this.emit('connected', connectedDevice)
      } else if (msg.a2dpstate === 'opened' && lastMsg.a2dpstate === 'opened' && msg.connect_state === 'disconnected' && lastMsg.connect_state === 'connected') {
        this.emit('disconnected')
      } else if (msg.connect_state === 'connect failed') {
        this.emit('connect failed')
      } else if (msg.connect_state === 'connect over') {
        this.emit('autoconnect failed')
      }
      lastMsg = Object.assign(lastMsg, msg)
    } else if (msg.action === 'discovery') {
      var results = msg.results
      logger.debug(`Found ${results.deviceList.length} bluetooth devices:`)
      for (var i = 0; i < results.deviceList.length; i++) {
        logger.debug(`  ${results.deviceList[i].name} : ${results.deviceList[i].address}`)
      }
      this.emit('discovery', results)
    }
  } catch (err) {
    /**
     * When something is wrong.
     * @event module:@yoda/bluetooth.BluetoothSource#error
     * @type {Error}
     */
    this.emit('error', err)
  }
}

/**
 * @private
 */
BluetoothSource.prototype._send = function (cmdstr, props) {
  var data = Object.assign({ command: cmdstr }, props || {})
  var msg = [ JSON.stringify(data) ]
  logger.debug(`_send(${JSON.stringify(data)})`)
  if (cmdstr === 'ON') {
    return this._flora.post('bluetooth.a2dpsource.command', msg, floraFactory.MSGTYPE_PERSIST)
  } else {
    return this._flora.post('bluetooth.a2dpsource.command', msg, floraFactory.MSGTYPE_INSTANT)
  }
}

/**
 * Turn on the bluetooth in source mode, it starts the `a2dp-source`, and waits for the connection
 * to a peer.
 *
 * You should listens the following events:
 * - `opened` when the `a2dp-source` is opened.
 * - `closed` when the `a2dp-source` is closed.
 * - `stateupdate` when any of states updated.
 * - `error` when something went wrong from bluetooth service.
 *
 * @param {string} name - the bluetooth name.
 * @param {string} subsequent - the subsequent command.
 * @param {function} cb
 * @returns {null}
 * @fires module:@yoda/bluetooth.BluetoothSource#opened
 * @fires module:@yoda/bluetooth.BluetoothSource#closed
 * @fires module:@yoda/bluetooth.BluetoothSource#stateupdate
 * @fires module:@yoda/bluetooth.BluetoothSource#error
 * @example
 * var source = require('@yoda/bluetooth').getSource()
 * source.on('opened', () => {
 *   console.log('bluetooth has been opened')
 * })
 * source.start('YodaOS Bluetooth')
 *
 */
BluetoothSource.prototype.open = function open (name) {
  logger.debug('open()')
  return this._send('ON', {name: name, unique: true})
}

/**
 * Turn off the bluetooth.
 * @returns {null}
 */
BluetoothSource.prototype.close = function close () {
  logger.debug(`close(cur state: ${lastMsg.a2dpstate})`)
  if (lastMsg.a2dpstate === 'closed') {
    process.nextTick(() => this.emit('closed'))
  } else {
    this._send('OFF')
  }
}
BluetoothSource.prototype.end = function end () {
  this.close()
}

/**
 * Connect to devices
 */
BluetoothSource.prototype.connect = function connectTo (addr, name) {
  logger.debug(`connect(${name}:${addr})`)
  var target = {'address': addr, 'name': name}
  if (lastMsg.a2dpstate !== 'opened') {
    process.nextTick(() => {
      return this.emit('connect failed')
    })
  } else if (lastMsg.connect_state === 'connected' && lastMsg.connect_address === addr) {
    // Connect to same device, return succ immediatelly.
    process.nextTick(() => {
      return this.emit('connected', target)
    })
  } else {
    return this._send('CONNECT', target)
  }
}

/**
 * Disconnect from the connected bluetooth sink device.
 */
BluetoothSource.prototype.disconnect = function disconnectFrom () {
  logger.debug('disconnect()')
  if (lastMsg.connect_state !== 'connected') {
    process.nextTick(() => {
      return this.emit('disconnected')
    })
  } else {
    return this._send('DISCONNECT_PEER')
  }
}

/**
 * Scan around devices
 */
BluetoothSource.prototype.discovery = function discovery () {
  logger.debug(`discovery(cur state: ${lastMsg.a2dpstate})`)
  if (lastMsg.a2dpstate !== 'opened') {
    process.nextTick(() => {
      return this.emit('discovery', {'deviceList': {}, 'is_completed': true})
    })
  } else {
    return this._send('DISCOVERY')
  }
}

/**
 * Some status query functions.
 */

BluetoothSource.prototype.isOpened = function isOpened () {
  return lastMsg.a2dpstate === 'opened'
}

BluetoothSource.prototype.isConnected = function isConnected () {
  return lastMsg.connect_state === 'connected'
}

BluetoothSource.prototype.getConnectedDevice = function getConnectedDevice () {
  return {address: lastMsg.connect_address, name: lastMsg.connect_name}
}

BluetoothSource.prototype.isDiscoverable = function isDiscoverable () {
  return lastMsg.broadcast_state === 'opened'
}

/**
 * Disconnect the event socket, this is deprecated please use `.destroyConnection()`
 * instead.
 */
BluetoothSource.prototype.disconnectConnection = function disconnectConnection () {
  return helper.disconnectAfterClose(this, 2000)
}

/**
 * Destroy the connection to bluetooth service, this firstly sends the OFF command
 * and destroy the connection.
 */
BluetoothSource.prototype.destroyConnection = function destroyConnection () {
  return helper.disconnectAfterClose(this, 2000)
}

exports.BluetoothSource = BluetoothSource
