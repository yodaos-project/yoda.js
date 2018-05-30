'use strict';

const https = require('https');
const qs = require('querystring');
const crypto = require('crypto');
const context = require('@rokid/context');
const logger = require('@rokid/logger')('mqtt');

// TODO(Yorkie): move something where?
// const host = 'mqtt-dev-registry.rokid.com';
const host = 'wormhole-registry.rokid.com';

function load() {
  const config = context.config;
  return {
    key: config.key,
    device_type_id: config.device_type_id,
    device_id: config.device_id,
    service: 'mqtt',
    version: '1',
    time: Math.floor(Date.now() / 1000),
    secret: config.secret,
  };
}

function getSign(data) {
  return crypto.createHash('md5')
    .update(qs.stringify(data))
    .digest('hex')
    .toUpperCase();
}

function registry(userId, cb) {
  const data = load();
  const req = https.request({
    method: 'POST',
    family: 4,
    host,
    path: '/api/registryByKey',
    headers: {
      'Content-Type': 'application/json',
    }
  }, (response) => {
    let list = [];
    response.on('data', (chunk) => list.push(chunk));
    response.once('end', () => {
      let data, err;
      try {
        data = JSON.parse(Buffer.concat(list));
      } catch (e) {
        err = e;
      }
      if (typeof cb === 'function') {
        cb(err, data);
      } else if (err) {
        logger.error(err && err.stack);
      }
    });
  });
  const msg = JSON.stringify({
    appKey: data.key,
    requestSign: getSign(data),
    deviceTypeId: data.device_type_id,
    deviceId: data.device_id,
    accountId: userId,
    service: data.service,
    time: data.time + '',
    version: data.version,
  });
  req.on('error', (err) => {
    cb(err);
  });
  req.write(msg);
  req.end();
}

exports.registry = registry;
