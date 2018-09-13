'use strict'

var crypto = require('crypto')

function gensigh (data) {
  var queryString = `key=${data.key}&device_type_id=${data.deviceTypeId}&device_id=${data.deviceId}&service=${data.service}&version=${data.version}&time=${data.time}&secret=${data.secret}`
  return crypto.createHash('md5')
    .update(queryString)
    .digest('hex')
    .toUpperCase()
}

function getAuth (config) {
  if (config === null) {
    return ''
  }
  var data = {
    key: config.key,
    deviceTypeId: config.deviceTypeId,
    deviceId: config.deviceId,
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
    `device_type_id=${data.deviceTypeId}`,
    `device_id=${data.deviceId}`,
    `service=${data.service}`
  ].join(';')
}

module.exports = getAuth
