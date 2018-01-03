'use strict';

exports.login = require('./login');
exports.bindDevice = require('./bind-device');
exports.connectMqtt = require('./mqtt').connectMqtt;
exports.checkUpgrade = require('./ota-upgrade').checkUpgrade;