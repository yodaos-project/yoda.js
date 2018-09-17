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
  // for dev: kamino开发阶段使用
  this.userId = property.get('persist.system.user.userId')
  this.config = config
  this.initialize()
}
inherits(MqttAgent, EventEmitter)

MqttAgent.prototype.initialize = function initialize () {
  this.register((err) => {
    if (err) {
      logger.error('register error with error', err && err.stack)
      return this.initialize()
    }
    this.connect()
  })
}

MqttAgent.prototype.register = function (cb) {
  mqttRegister.registry(this.userId, this.config, (err, data) => {
    if (err) {
      return cb(err)
    }
    this.mqttOptions = data
    cb(null)
  })
}

MqttAgent.prototype.connect = function () {
  handle = mqtt.connect(endpoint, {
    clientId: this.mqttOptions.username,
    username: this.mqttOptions.username,
    password: this.mqttOptions.token,
    rejectUnauthorized: true,
    reconnectPeriod: -1
  })
  handle.on('connect', () => {
    var channelId = `u/${this.userId}/deviceType/${this.config.deviceTypeId}/deviceId/${this.config.deviceId}/rc`
    handle.subscribe(channelId)
    logger.info('subscribed', channelId)
  })
  handle.on('offline', () => {
    logger.error(`offline, reconnecting`)
    handle.disconnect()
    handle.removeAllListeners()
    handle = null
    this.initialize()
  })
  handle.on('message', this.onMessage.bind(this))
  handle.on('error', (err) => {
    logger.error('MQTT connecting error:')
    logger.error(err && err.stack)
  })
}

MqttAgent.prototype.onMessage = function (channel, message) {
  var msg
  try {
    msg = JSON.parse(message + '')
  } catch (error) {
    msg = {}
    logger.log(error)
    logger.log('parse error with message: ', channel, message + '')
    logger.log(message.toString('hex'))
    return
  }
  logger.log('mqtt message with topic ->', msg.topic, '; text ->', msg.text)
  if (msg.topic === 'version') {
    this.sendToApp('version', 'ok')
  } else {
    this.emit('message', msg.topic, msg.text)
  }
}

MqttAgent.prototype.sendToApp = function (topic, text) {
  logger.log('mqtt send channel:', `u/${this.userId}/rc`)
  // console.log('--------------------------->', this.config, this.userId)
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
  logger.log('mqtt send message to app with topic ->', topic, '; text ->', text)
}

module.exports = MqttAgent
