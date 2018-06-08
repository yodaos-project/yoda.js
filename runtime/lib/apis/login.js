'use strict';

const https = require('https');
const fs = require('fs');
const qs = require('querystring');
const crypto = require('crypto');
const exec = require('child_process').execSync;
const property = require('@rokid/property');
const context = require('@rokid/context');
const logger = require('@rokid/logger')('apis');

const uuid = property.get('ro.boot.serialno');
const seed = property.get('ro.boot.rokidseed');
let secret, buffer;
let retry = 0;

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

if (uuid && seed) {
  const _seed = exec(`test-stupid ${seed} ${uuid}`);
  secret = md5(_seed.toString('base64'));
}

function login(callback) {
  if (!secret) {
    return callback(null);
  }
  const config = require('/data/system/openvoice_profile.json');
  if (config && config.disableAutoRefresh) {
    return callback(null);
  }
  const req = https.request({
    method: 'POST',
    host: 'device-account.rokid.com',
    path: '/device/login.do',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  }, (response) => {
    const list = [];
    response.on('data', (chunk) => list.push(chunk));
    response.once('end', () => {
      const body = Buffer.concat(list).toString();
      try {
        const location = '/data/system/openvoice_profile.json';
        const data = JSON.parse(JSON.parse(body).data);
        const config = require(location);
        config['device_id'] = data.deviceId;
        config['device_type_id'] = data.deviceTypeId;
        config['key'] = data.key;
        config['secret'] = data.secret;
        context.config = config;
        fs.writeFile(location, JSON.stringify(config, null, 2), (err) => {
          logger.info(`updated the ${location}`);
          callback(err, data);
        });
      } catch (err) {
        logger.error(err && err.stack);
        callback(err);
      }
    });
  });
  req.on('error', (err) => {
    if (retry <= 10) {
      retry += 1;
      logger.info('invalid certificate, try again once');
      return setTimeout(() => login(callback), 3000);
    }
  });
  
  const time = Math.floor(Date.now() / 1000);
  const sign = md5(`${secret}${uuid}${time}${secret}`);
  req.write(qs.stringify({
    deviceId: uuid,
    time,
    sign,
  }));
  req.end();
}

module.exports = function() {
  return new Promise((resolve, reject) => {
    login((err, data) => {
      err ? reject(err) : resolve(data);
    });
  });
};
