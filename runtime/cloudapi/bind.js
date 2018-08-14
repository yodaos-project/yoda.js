'use strict';

var https = require('https');
var crypto = require('crypto');
var logger = console;
var property = require('property');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

var CONFIG = null;
var login = require('./login');
var retry = 0;

function deviceManager (cf, path, cb) {
  if (retry > 10) {
    cb(new Error(path + 'failed after retry 10'));
    return;
  }
  logger.log('start request', path);
  logger.log('config:', cf);
  var time = Math.floor(Date.now() / 1000);
  var userId = property.get('persist.system.user.userId');
  var sign = md5(`key=${cf.key}&device_type_id=${cf.device_type_id}&device_id=${cf.device_id}&service=bindMaster&version=1.0&time=${time}&secret=${cf.secret}`);
  var auth = `version=1.0;time=${time};sign=${sign};key=${cf.key};device_type_id=${cf.device_type_id};device_id=${cf.device_id};service=bindMaster`;
  var params = `{"userId":"${userId || ''}"}`;
  logger.log('sign:', sign);
  logger.log('auth:', auth);
  logger.log('params:', params);
  var req = https.request({
    method: 'POST',
    host: 'apigwrest.open.rokid.com',
    path: path,
    headers: {
      'Content-Length': params.length,
      'Content-Type': 'application/json;charset=utf-8',
      'Authorization': auth
    }
  }, (response) => {
    var list = [];
    response.on('data', (chunk) => {
      list.push(chunk);
    });
    response.on('end', () => {
      var result = Buffer.concat(list).toString();
      logger.log(path + ' response:', result);
      try {
        result = JSON.parse(result);
        if (result.resultCode === 0) {
          logger.log(path + ' -> response ok');
          cb(null, cf);
        } else {
          logger.log(path + ' -> response', result.message, result.resultCode);
          cb(new Error(result.message));
        }
      } catch (error) {
        logger.log(path + ' -> parse error', error);
        cb(error);
      }
    });
  });
  req.on('error', (err) => {
    logger.log(path + ' fail, retry', err);
    retry++;
    setTimeout(() => {
      bindDevice(cf, cb);
    }, 3000);
  });
  req.write(params);
  req.end();
}

function loginAndBindDevice (cb) {
  
  login().then((config) => {
    CONFIG = config;
    deviceManager(config, '/v1/device/deviceManager/bindMaster', cb);
  }).catch((err) => {
    cb(err);
  });

}

module.exports.bindDevice = function () {
  return new Promise((resolve, reject) => {
    loginAndBindDevice((err, config) => {
      if (err) {
        reject(err);
      } else {
        resolve(config);
      }
    });
  });
};

// 解绑设备
module.exports.unBindDevice = function () {
  return new Promise((resolve, reject) => {
    if (CONFIG) {
      deviceManager(CONFIG, '/v1/device/deviceManager/unBindMaster', (err, config) => {
        if (err) {
          reject(err);
        } else {
          resolve(config);
        }
      });
    } else {
      login().then((config) => {
        deviceManager(config, '/v1/device/deviceManager/unBindMaster', (err, config) => {
          if (err) {
            reject(err);
          } else {
            resolve(config);
          }
        });
      });
    }
  });
};