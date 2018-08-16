'use strict';

var device = require('./bind');
var mqttAgent = require('./mqtt');

exports.connect = function() {
  return new Promise((resolve, reject) => {
    device.bindDevice()
      .then((config) => {
        var mqttagent = new mqttAgent(config);
        resolve(mqttagent);
      })
      .catch((err) => {
        reject(err);
      });
  });
}