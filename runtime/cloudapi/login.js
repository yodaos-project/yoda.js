'use strict';

var https = require('https');
var fs = require('fs');
var qs = require('querystring');
var crypto = require('crypto');
var exec = require('child_process').exec;
var property = require('property');
// var context = require('@rokid/context');
var logger = require('logger')('login');

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
  logger.log('exe test-stupid', seed, uuid);

  exec('test-stupid ' + seed + ' ' + uuid, {
    encoding: 'buffer'
  }, function(error, stdout, stderr){
    if (error) {
      logger.error('exe error', error);
      callback(error);
      return;
    }
    var _seed = stdout;
    logger.log('exec result: ' + _seed.toString('base64'));
    secret = md5(_seed.toString('base64'));
    if (!secret) {
      return callback(new Error('can not get secret'));
    }
    var config = {};
    try {
      config = require('/data/system/openvoice_profile.json');
    } catch (error) {
      logger.error('no such file: /data/system/openvoice_profile.json, please create it');
    }
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
    logger.log('start /login request');
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
        logger.log('request /login response: ', body);
        try {
          var location = '/data/system/openvoice_profile.json';
          var data = JSON.parse(JSON.parse(body).data);

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
      logger.log('login request error', err);
      if (retry <= 10) {
        retry += 1;
        logger.info('invalid certificate, try again once');
        return setTimeout(() => login(callback), 3000);
      }
    });
    req.write(params);
    req.end();
  });
}

module.exports = function () {
  return new Promise((resolve, reject) => {
    login((err, data) => {
      err ? reject(err) : resolve(data);
    });
  });
};