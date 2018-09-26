'use strict'

var https = require('https')
var qs = require('querystring')
var crypto = require('crypto')
var logger = require('logger')('mqtt')
var env = require('../env')()

function load (config) {
  return {
    key: config.key,
    device_type_id: config.deviceTypeId,
    device_id: config.deviceId,
    service: 'mqtt',
    version: '1',
    time: Math.floor(Date.now() / 1000),
    secret: config.secret
  }
}

function getSign (data) {
  return crypto.createHash('md5')
    .update(qs.stringify(data))
    .digest('hex')
    .toUpperCase()
}

function registry (userId, config, cb) {
  logger.info('start request /api/registryByKey with userId:', userId)
  var data = load(config)
  var msg = JSON.stringify({
    appKey: data.key,
    requestSign: getSign(data),
    deviceTypeId: data.device_type_id,
    deviceId: data.device_id,
    accountId: userId,
    service: data.service,
    time: `${data.time}`,
    version: data.version
  })
  var req = https.request({
    method: 'POST',
    family: 4,
    host: env.mqtt.registry,
    path: '/api/registryByKey',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': msg.length
    }
  }, (response) => {
    logger.info(`${response.statusCode} /api/registryByKey`)

    var list = []
    response.on('data', (chunk) => list.push(chunk))
    response.once('end', () => {
      var data, err, msg
      msg = Buffer.concat(list).toString()
      try {
        data = JSON.parse(msg)
        // check if logged in.
        if (data && data.error) {
          err = new Error(data.error)
        }
      } catch (e) {
        err = e
      }
      if (typeof cb === 'function') {
        cb(err, data)
      } else if (err) {
        logger.error(err && err.stack)
      }
    })
  })
  req.on('error', (err) => {
    cb(err)
  })
  req.write(msg)
  req.end()
}

exports.registry = registry
