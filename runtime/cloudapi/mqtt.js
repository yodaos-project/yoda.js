'use strict';

var mqtt = require('mqtt');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var property = require('property');
var mqttRegister = require('./mqtt-register');
var logger = console;

var endpoint = 'mqtts://wormhole.rokid.com:8885';
var handle = null;

function MqttAgent(config) {
  EventEmitter.call(this);
  // for dev: kamino开发阶段使用
  this.userId = property.get('persist.system.user.userId') || 'C12E2A054F3C4D519D516A6032B530CF';
  this.config = config;
  this.register().then(() => {
    this.reConnect();
  }).catch((err) => {
    logger.error(err);
  });
}
inherits(MqttAgent, EventEmitter);

MqttAgent.prototype.register = function () {
  var self = this;
  return new Promise((resolve, reject) => {
    mqttRegister.registry(this.userId, this.config, function (err, data) {
      if (err) {
        reject(err);
      } else {
        self.mqttOptions = data;
        resolve(data);
      }
    });
  });
};

MqttAgent.prototype.reConnect = function () {
  if (handle) {
    handle.end(true);
  }
  handle = mqtt.connect(endpoint, {
    clientId: this.mqttOptions.username,
    username: this.mqttOptions.username,
    password: this.mqttOptions.token,
    rejectUnauthorized: true,
    reconnectPeriod: 5000,
  });
  handle.on('connect', () => {
    var channelId = `u/${this.userId}/deviceType/${this.config.device_type_id}/deviceId/${this.config.device_id}/rc`;
    handle.subscribe(channelId);
    logger.info('subscribed', channelId);
  });
  handle.on('reconnect', () => {
    this.register();
  });
  handle.on('message', this.onMessage.bind(this));
  handle.on('error', (err) => {
    logger.error('MQTT connecting error:');
    logger.error(err && err.stack);
  });
};

MqttAgent.prototype.onMessage = function (channel, message) {
  var msg;
  try {
    msg = JSON.parse(message + '');
  } catch (error) {
    msg = {};
    logger.log(error);
    logger.log('parse error with message: ', channel, message);
    logger.log(message.toString('hex'));
    return;
  }
  logger.log('mqtt message with topic ->', msg.topic, '; text ->', msg.text);
  if (msg.topic === 'version') {
    this.sendToApp('version', 'ok');
  } else {
    this.emit(msg.topic, msg.text);
  }
};

MqttAgent.prototype.sendToApp = function (topic, text) {
  logger.log('mqtt send channel:', `u/${this.userId}/rc`);
  handle.publish(`u/${this.userId}/rc`, JSON.stringify({
    reviceDevice: {
      accountId: this.userId,
    },
    sourceDevice: {
      deviceId: this.config.device_id,
      deviceType: this.config.device_type_id
    },
    topic: topic,
    text: text,
    messageId: Date.now() + '',
  }));
  logger.log('mqtt send message to app with topic ->', topic, '; text ->', text);
};

module.exports = MqttAgent;
