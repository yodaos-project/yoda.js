'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').execSync;
const protobuf = require('protobufjs');
const property = require('@rokid/property');
const context = require('@rokid/context');
const logger = require('@rokid/logger')('apis');

const proto = protobuf.loadSync(path.join(__dirname, '../proto/Login.proto'));
const Request = proto.lookupType('LoginReqPB');
const Response = proto.lookupType('LoginResPB');

const uuid = property.get('ro.boot.serialno');
const seed = property.get('ro.boot.rokidseed');
let secret, buffer;
let retry = 0;

if (uuid && seed) {
  secret = exec(`test-stupid ${seed} ${uuid}`).toString('base64');
  buffer = Request.encode(
    Request.create({
      timestamp: Date.now() + '',
      reqType: 1,
      identity: 1,
      uuid,
      secret,
    })
  ).finish();
}

function login(callback) {
  if (!secret || !buffer) {
    return callback(null);
  }
  const config = require('/data/system/openvoice_profile.json');
  if (config && config.disableAutoRefresh) {
    return callback(null);
  }
  const req = https.request({
    method: 'POST',
    host: 'account.service.rokid.com',
    path: '/bcustomer_login_platform.do',
    headers: {
      'Content-Type': 'application/octet-stream',
    }
  }, (response) => {
    let list = [];
    response.on('data', (chunk) => list.push(chunk));
    response.once('end', () => {
      const pb = Buffer.concat(list);
      try {
        const location = '/data/system/openvoice_profile.json';
        const data = JSON.parse(Response.decode(pb).result);
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
  req.on('error', () => {
    setTimeout(() => {
      login(callback);
    }, 5000);
  });
  req.write(buffer);
  req.end();
}

module.exports = function() {
  return new Promise((resolve, reject) => {
    login((err, data) => {
      err ? reject(err) : resolve(data);
    });
  });
};