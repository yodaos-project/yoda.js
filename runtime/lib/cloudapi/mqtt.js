'use strict'

var mqtt = require('mqtt')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var property = require('@yoda/property')
var mqttRegister = require('./mqtt-register')
var logger = require('logger')('mqtt')
var env = require('../env')()

var endpoint = env.mqtt.uri
var handle = null

function MqttAgent (config) {
  EventEmitter.call(this)
  this.config = config
  this.userId = property.get('system.user.userId', 'persist')
  this.initialize()
}
inherits(MqttAgent, EventEmitter)

MqttAgent.prototype.initialize = function initialize () {
  this.disconnect()
  this.register((err) => {
    if (err) {
      logger.error('register error with error', err && err.stack)
      return this.initialize()
    }
    this.connect()
  })
}

MqttAgent.prototype.register = function register (cb) {
  mqttRegister.registry(this.userId, this.config, (err, data) => {
    if (err) {
      return cb(err)
    }
    this.mqttOptions = data
    cb(null)
  })
}

MqttAgent.prototype.connect = function connect () {
  handle = mqtt.connect(endpoint, {
    clientId: this.mqttOptions.username,
    username: this.mqttOptions.username,
    password: this.mqttOptions.token,
    rejectUnauthorized: true,
    reconnectPeriod: -1
  })
  handle.on('connect', () => {
    var userId = this.userId
    var deviceId = this.config.deviceId
    var deviceTypeId = this.config.deviceTypeId
    var channelId = `u/${userId}/deviceType/${deviceTypeId}/deviceId/${deviceId}/rc`
    handle.subscribe(channelId)
    logger.info('subscribed', channelId)
  })
  handle.on('offline', () => {
    logger.error(`offline, reconnecting`)
    this.initialize()
  })
  handle.on('message', this.onMessage.bind(this))
  handle.on('error', (err) => {
    logger.error(`MQTT connecting error(${err && err.stack})`)
    this.initialize()
  })
}

MqttAgent.prototype.disconnect = function disconnect () {
  if (handle) {
    handle.disconnect()
    handle.removeAllListeners()
    handle = null
  }
}

MqttAgent.prototype.onMessage = function onMessage (channel, message) {
  var msg
  try {
    msg = JSON.parse(message + '')
  } catch (err) {
    msg = {}
    logger.error(err && err.stack)
    logger.error('parse error with message: ', channel, message + '')
    logger.error(message.toString('hex'))
    return
  }
  logger.info(`mqtt message with topic -> ${msg.topic}; text -> ${msg.text}`)
  if (msg.topic === 'version') {
    this.sendToApp('version', 'ok')
  } else {
    this.emit('message', msg.topic, msg.text)
  }
}

MqttAgent.prototype.sendToApp = function sendToApp (topic, text) {
  if (handle == null) {
    throw new Error('mqtt is not connected yet')
  }
  logger.info('mqtt send channel:', `u/${this.userId}/rc`)
  handle.publish(`u/${this.userId}/rc`, JSON.stringify({
    reviceDevice: {
      accountId: this.userId
    },
    sourceDevice: {
      deviceId: this.config.deviceId,
      deviceType: this.config.deviceType
    },
    topic: topic,
    text: text,
    messageId: Date.now() + ''
  }))
  logger.info('mqtt send message to app with topic ->', topic, '; text ->', text)
}

module.exports = MqttAgent
