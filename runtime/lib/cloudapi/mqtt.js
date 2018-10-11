'use strict'

var mqtt = require('mqtt')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var mqttRegister = require('./mqtt-register')
var logger = require('logger')('mqtt')
var env = require('../env')()

var reconnectTimeout = 2000
var endpoint = env.mqtt.uri
var handle = null
var shouldOffline = false

/**
 * @class
 * @auguments EventEmitter
 * @param {object} config -
 * @param {string} config.masterId - the `masterId`.
 * @param {string} config.deviceId - the `deviceId`.
 * @param {string} config.key - the cloud key.
 * @param {string} config.secret - the cloud secret.
 */
function MqttAgent (config) {
  EventEmitter.call(this)
  this.config = config
  this.reconnecting = false
  this.reconnectTimer = null
  this.mqttOptions = null
  this.initialize()
}
inherits(MqttAgent, EventEmitter)

/**
 * Initialize the MQTT connecting which includes:
 * - disconnect if current has connected.
 * - start registering the MQTT token.
 * - connect the MQTT.
 *
 * Note that if handle is marked as disconnected(null), it will
 * skip the time of initializing.
 */
MqttAgent.prototype.initialize = function initialize () {
  logger.info('start initializing the mqtt')
  shouldOffline = false
  this.disconnect() // this clears the `reconnectTimer` and `reconnecting`.
  this.register((err) => {
    if (shouldOffline) {
      logger.warn('skip connect because the handle has been flagged as null')
      return
    }
    if (err) {
      logger.error('register error', err && err.stack)
      this.reconnect()
    } else {
      logger.info('register succssfully and start connecting.')
      this.connect()
    }
  })
}

/**
 * Fetch the token by the auth config.
 * @param {function} cb -
 */
MqttAgent.prototype.register = function register (cb) {
  mqttRegister.registry(this.config, (err, data) => {
    if (err) {
      return cb(err)
    }
    this.mqttOptions = data
    cb(null, data)
  })
}

/**
 * Connect the MQTT broker. If the connection has been established, it disconnects
 * in subsequent. This function must be called within an un-null `mqttOptions` by
 * `register()`.
 *
 * @throws {Error} call `register()` is required.
 */
MqttAgent.prototype.connect = function connect () {
  if (this.mqttOptions === null) {
    throw new Error('call `register()` is required.')
  }
  if (handle != null) {
    this.disconnect()
  }
  handle = mqtt.connect(endpoint, {
    clientId: this.mqttOptions.username,
    username: this.mqttOptions.username,
    password: this.mqttOptions.token,
    rejectUnauthorized: true,
    reconnectPeriod: -1
  })
  handle.on('connect', () => {
    var masterId = this.config.masterId
    var deviceId = this.config.deviceId
    var deviceTypeId = this.config.deviceTypeId
    var channelId = `u/${masterId}/deviceType/${deviceTypeId}/deviceId/${deviceId}/rc`
    handle.subscribe(channelId)
    logger.info('subscribed', channelId)
  })
  handle.on('offline', () => {
    logger.error(`mqtt is offline`)
    if (!shouldOffline) {
      this.reconnect()
    }
  })
  handle.on('message', this.onMessage.bind(this))
  handle.on('error', (err) => {
    if (!shouldOffline && err.message === 'Not Authorized') {
      logger.info('checked not authorized error, just try to reconnect')
      return this.reconnect()
    }
    logger.error(`mqtt occurs an error`, err)
  })
}

/**
 * Reconnect MQTT connects with `reconnectTimeout`.
 */
MqttAgent.prototype.reconnect = function reconnect () {
  if (this.reconnecting === true || handle === null) {
    logger.warn('mqtt is reconnecting, just skip')
    return
  }
  this.reconnecting = true
  logger.info(`starts to reconnect after ${reconnectTimeout}ms`)
  this.reconnectTimer = setTimeout(this.initialize.bind(this), reconnectTimeout)
}

/**
 * Disconnect the current connection and mark the global variable as a null value.
 */
MqttAgent.prototype.disconnect = function disconnect () {
  // clear the reconnect-related handles
  this.mqttOptions = null
  this.reconnecting = false
  clearTimeout(this.reconnectTimer)

  // clear handle
  if (handle) {
    logger.info('disconnecting the mqtt and set the handle to null')
    handle.disconnect()
    handle.removeAllListeners()
    handle = null
  } else {
    logger.info('just skip disconnect, because the handle has already been disconnected')
  }
}

/**
 * Set the MQTT to be offline.
 */
MqttAgent.prototype.offline = function offline () {
  shouldOffline = true
  this.disconnect()
}

/**
 * Handle the message
 * @param {string} channel - the channel.
 * @param {Buffer} message - the receving message.
 */
MqttAgent.prototype.onMessage = function onMessage (channel, message) {
  var msg
  try {
    msg = JSON.parse(message + '')
  } catch (err) {
    logger.error(`parse error with message: ${channel} ${message}`)
    logger.error(err && err.stack)
    return
  }
  logger.info(`mqtt message with topic -> ${msg.topic}; text -> ${msg.text}`)
  if (msg.topic === 'version') {
    this.sendToApp('version', 'ok')
  } else {
    this.emit('message', msg.topic, msg.text)
  }
}

/**
 * Send the topic the app channel.
 * @param {string} topic
 * @param {Buffer} text
 * @throws {Error} mqtt is not connected yet.
 */
MqttAgent.prototype.sendToApp = function sendToApp (topic, text) {
  if (handle == null) {
    throw new Error('mqtt is not connected yet.')
  }
  var masterId = this.config.masterId
  logger.info('mqtt send channel:', `u/${masterId}/rc`)
  handle.publish(`u/${masterId}/rc`, JSON.stringify({
    reviceDevice: {
      accountId: masterId
    },
    sourceDevice: {
      deviceId: this.config.deviceId,
      deviceType: this.config.deviceType
    },
    topic: topic,
    text: text,
    messageId: Date.now() + ''
  }))
  logger.info(`mqtt send message to app with topic -> ${topic}; text -> ${text}`)
}

module.exports = MqttAgent
