'use strict'

var mqtt = require('mqtt')
var _ = require('@yoda/util')._
var logger = require('logger')('mqtt')
var env = require('@yoda/env')()

// The initial backoff time after a disconnection occurs, in seconds.
var MINIMUM_BACKOFF_TIME = 1
// The maximum backoff time before giving up, in seconds.
var MAXIMUM_BACKOFF_TIME = 64

/**
 * @constructor
 * @param {RokidStore} store - the `RokidStore` object.
 * @param {object} options - the options
 */
function MqttClient (store, options) {
  this.store = store
  this.payload = {
    username: null,
    token: null,
    expireTime: null
  }
  this.options = Object.assign({
    reconnectTimeout: 2000
  }, options || {})

  // internal members
  this._isOnline = false
  this._isConnecting = false
  this._rejectReconnect = false
  this._lastSubscribed = null
  this._mqttHandle = null
  this._messageHandler = null
  this._backoffTime = MINIMUM_BACKOFF_TIME
}

/**
 * @method
 */
MqttClient.prototype.needsRefresh = function needsRefresh () {
  return this.payload.username == null ||
    this.payload.token == null ||
    this.payload.expireTime == null ||
    (this.payload.expireTime * 1000 < Date.now())
}

/**
 * @method
 */
MqttClient.prototype.getChannelName = function getChannelName () {
  return [
    `u/${this.store.config.masterId}`,
    `deviceType/${this.store.config.deviceTypeId}`,
    `deviceId/${this.store.config.deviceId}`,
    'rc'
  ].join('/')
}

/**
 * @method
 */
MqttClient.prototype.setMessageHandler = function setMessageHandler (handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('handler must be a function.')
  }
  this._messageHandler = handler
}

/**
 * @method
 */
MqttClient.prototype.onmessage = function onmessage (channel, message) {
  if (typeof this._messageHandler !== 'function') {
    return logger.warn('You need setMessageHandler() before handling message')
  }
  var msg
  try {
    msg = JSON.parse(message + '')
  } catch (err) {
    logger.error(`parse error with message: ${channel} ${message}`)
    logger.error(err && err.stack)
    return
  }
  logger.info(`mqtt message with topic -> ${msg.topic}; text -> ${msg.text}`)
  this._messageHandler(msg.topic, msg.text)
}

/**
 * @method
 */
MqttClient.prototype.start = function start (opts) {
  var future = Promise.resolve()
  var forceReconnect = _.get(opts, 'forceReconnect', false)
  var forceRefresh = _.get(opts, 'forceRefresh', false)

  if (!forceReconnect && this._rejectReconnect) {
    logger.warn(`because rejectReconnect is true, so discard this connecting`)
    return future
  }
  if (forceReconnect) {
    this._rejectReconnect = false
  }
  if (forceRefresh || this.needsRefresh()) {
    logger.info('needs fetch the token, just start requesting..')
    future = this.store.requestMqttToken().then((data) => {
      logger.info('request register successfully and ready connect to mqtt')
      this.payload.username = data.username
      this.payload.token = data.token
      this.payload.expireTime = data.expireTime
    }, (err) => {
      logger.error(
        `fetch occurs fatel error, please check the script`, err && err.message)
      throw err // still throws the error
    })
  }
  return future.then(() => {
    var connOpts = {
      rejectUnauthorized: true,
      reconnectPeriod: -1,
      clientId: this.payload.username,
      username: this.payload.username,
      password: this.payload.token
    }
    this._mqttHandle = mqtt.connect(env.mqtt.uri, connOpts)
    this._isConnecting = true
    logger.info(`start connecting mqtt to ${env.mqtt.uri}`)

    this._mqttHandle.once('connect', () => {
      this._backoffTime = MINIMUM_BACKOFF_TIME // reset backoff once connected.
      this._rejectReconnect = false
      this._isConnecting = false
      this._isOnline = true
      logger.info(`connected to ${env.mqtt.uri} and enable reconnect`)

      var channel = this.getChannelName()
      this._mqttHandle.subscribe(channel, () => {
        logger.info(`subscribed ${channel}`)
        this._lastSubscribed = channel
      })
    })
    this._mqttHandle.on('message', this.onmessage.bind(this))
    this._mqttHandle.on('error', (err) => {
      var msg = err && err.message
      logger.error(`there is an error(${msg}) and set connecting is false`)
      this._isConnecting = false
      this.reconnect()
    })
    this._mqttHandle.on('offline', () => {
      logger.warn('receives the offline event, the network maybe not stable')
      this.reconnect()
    })
  }, (_) => {
    logger.info('occurs an error, set _isConnecting to false and reconnect')
    this._isConnecting = false
    this.reconnect()
  })
}

/**
 * @method
 */
MqttClient.prototype.reconnect = function reconnect () {
  if (this._isConnecting === true) {
    logger.warn('the previous connection is still going, just skip')
    return
  }
  if (this._isOnline === false && !this._isConnecting) {
    logger.warn('it might be last reconnect fails, just retry')
  } else {
    this._isOnline = false
    logger.warn('set the online state => false')
  }

  // initialized the `reconnectTimeout` as base
  var reconnectDelayMs = this.options.reconnectTimeout
  reconnectDelayMs += Math.floor(1000 * (this._backoffTime + Math.random()))
  if (this._backoffTime <= MAXIMUM_BACKOFF_TIME) {
    this._backoffTime *= 2
  }
  this._isConnecting = true
  logger.log(`backing off for ${reconnectDelayMs}ms before reconnecting.`)

  setTimeout(() => {
    this.start({ forceRefresh: true })
  }, reconnectDelayMs)
}

/**
 * @method
 */
MqttClient.prototype.suspend = function suspend () {
  if (this._mqttHandle == null) {
    logger.warn('call suspend on unconnected mqtt client')
    return
  }
  this._rejectReconnect = true
  this._mqttHandle.disconnect()
  this._mqttHandle.removeAllListeners()
  this._mqttHandle = null
  this._backoffTime = MINIMUM_BACKOFF_TIME
}

/**
 * @method
 */
MqttClient.prototype.sendToApp = function sendToApp (topic, text) {
  if (this._mqttHandle == null) {
    // TODO: support local cache queue
    logger.warn(`call sendToApp on unconnected mqtt client, #${topic}(${text})`)
    return
  }

  var masterId = this.store.config.masterId
  logger.info('mqtt send channel:', `u/${masterId}/rc`)
  this._mqttHandle.publish(`u/${masterId}/rc`, JSON.stringify({
    messageId: Date.now() + '',
    topic: topic,
    text: text,
    reviceDevice: {
      accountId: masterId
    },
    sourceDevice: {
      deviceId: this.store.config.deviceId,
      deviceType: this.store.config.deviceType
    }
  }))
  logger.info(`send message to app with topic -> ${topic}; text -> ${text}`)
}

module.exports = MqttClient
