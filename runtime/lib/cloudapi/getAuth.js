'use strict'

var crypto = require('crypto')
var qs = require('querystring')

function gensigh (data) {
  return crypto.createHash('md5')
    .update(qs.stringify(data))
    .digest('hex')
    .toUpperCase()
}

function getAuth (config) {
  if (config === null) {
    return ''
  }
  var data = {
    key: config.key,
    device_type_id: config.device_type_id,
    device_id: config.device_id,
    service: 'rest',
    version: '1',
    time: Math.floor(Date.now() / 1000),
    secret: config.secret
  }
  return [
    `version=${data.version}`,
    `time=${data.time}`,
    `sign=${gensigh(data)}`,
    `key=${data.key}`,
    `device_type_id=${data.device_type_id}`,
    `device_id=${data.device_id}`,
    `service=${data.service}`
  ].join(';')
}

module.exports = getAuth
