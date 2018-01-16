'use strict';

const mqtt = require('mqtt');
const context = require('@rokid/context');
const property = require('@rokid/property');
const registry = require('./mqtt-registry').registry;
const EventEmitter = require('events').EventEmitter;

// FIXME(Yorkie): tweak to online?
// const endpoint = 'mqtt://mqtt-dev.rokid.com';
const endpoint = 'mqtts:://wormhole.rokid.com:8885';
let handle = null;

/**
 * @class MqttAgent
 * @extends EventEmitter
 */
class MqttAgent extends EventEmitter {
  /**
   * @method constructor
   * @param {String} userId
   * @param {String} deviceId
   * @param {String} deviceTypeId
   */
  constructor(userId, deviceId, deviceTypeId) {
    super();
    if (handle) {
      handle.end(true);
    }
    this._handle = null;
    this._userId = userId;
    this._deviceId = deviceId;
    this._deviceTypeId = deviceTypeId;
    registry(userId, this._onTryConnect.bind(this));
  }
  /**
   * @method _onTryConnect
   */
  _onTryConnect(err, data) {
    if (err) {
      console.error('MQTT connecting error:');
      console.error(err && err.stack);
      return;
    }
    this._handle = handle = mqtt.connect(endpoint, {
      clientId: data.username,
      username: data.username,
      password: data.token,
      rejectUnauthorized: true,
    });
    this._handle.on('connect', () => {
      const channelId = `u/${this._userId}/deviceType/${this._deviceTypeId}/deviceId/${this._deviceId}/rc`;
      this._handle.subscribe(channelId);
      console.info('subscribed', channelId);
    });
    this._handle.on('message', this._onMessage.bind(this));
    this._handle.on('error', (err) => {
      console.error('MQTT connecting error:');
      console.error(err && err.stack);
    });
  }
  /**
   * @method _onMessage
   */
  _onMessage(channel, data) {
    let msg, text;
    try {
      msg = JSON.parse(data + '');
    } catch (err) {
      console.error('received the error message from channel:', data);
    }
    if (msg.topic === 'version') {
      this.sendToApp('version', 'ok');
    } else {
      this.emit(msg.topic, msg.text);
      console.log(msg.topic, msg.text);
    }
  }
  /**
   * @method sendToApp
   */
  sendToApp(topic, text) {
    this._handle.publish(`u/${this._userId}/rc`, JSON.stringify({
      reviceDevice: {
        accountId: this._userId,
      },
      topic,
      text,
      messageId: Date.now() + '',
    }));
  }
}

function connectMqtt() {
  const userId = property.get('persist.system.user.userId');
  const config = context.config;
  if (!userId || !config)
    return false;
  else
    return new MqttAgent(userId, config.device_id, config.device_type_id);
}

exports.MqttAgent = MqttAgent;
exports.connectMqtt = connectMqtt;
