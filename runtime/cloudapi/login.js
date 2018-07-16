'use strict';

var https = require('https');
var fs = require('fs');
var qs = require('querystring');
var crypto = require('crypto');
var spawn = require('child_process').spawn;
var property = require('@rokid/rokidos/packages/property/property.node');
// var context = require('@rokid/context');
var logger = console;

var uuid = property.get('ro.boot.serialno');
var seed = property.get('ro.boot.rokidseed');
var secret, buffer;
var retry = 0;

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}


function login(callback) {
  if (!uuid || !seed) {
    callback(new Error('expect uuid and seed'));
    return;
  }
  var testStupid = spawn('test-stupid', [seed, uuid]);
  testStupid.stdout.on('data', (data) => {
    var _seed = data;
    secret = md5(_seed.toString('base64'));
    if (!secret) {
      return callback(null);
    }
    var config = require('/data/system/openvoice_profile.json');
    if (config && config.disableAutoRefresh) {
      return callback(null);
    }

    var type = config['device_type_id'] || '';
    if (type === 'rokid_test_type_id') {
      type = '';
    }
    var time = Math.floor(Date.now() / 1000);
    var sign = md5(`${secret}${type}${uuid}${time}${secret}`);
    var params = qs.stringify({
      deviceId: uuid,
      deviceTypeId: type ? type : undefined,
      time: time,
      sign: sign,
    });

    var req = https.request({
      method: 'POST',
      host: 'device-account.rokid.com',
      path: '/device/login.do',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': params.length
      }
    }, (response) => {
      var list = [];
      response.on('data', (chunk) => list.push(chunk));
      response.once('end', () => {
        var body = Buffer.concat(list).toString();
        logger.log('login res: ', body);
        try {
          var location = '/data/system/openvoice_profile.json';
          var data = JSON.parse(JSON.parse(body).data);
          var config = require(location);
          config['device_id'] = data.deviceId;
          config['device_type_id'] = data.deviceTypeId;
          config['key'] = data.key;
          config['secret'] = data.secret;
          // context.config = config;
          fs.writeFile(location, JSON.stringify(config, null, 2), (err) => {
            logger.info(`updated the ${location}`);
            callback(err, config);
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
    req.write(params);
    req.end();
  });
  testStupid.stderr.on('data', (data) => {
    logger.log('std error: ', data.toString());
  });
}

module.exports = function () {
  return new Promise((resolve, reject) => {
    login((err, data) => {
      err ? reject(err) : resolve(data);
    });
  });
};