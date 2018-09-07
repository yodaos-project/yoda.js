'use strict'

/**
 * Cloud API request library.
 * @module @yoda/cloudgw
 */

var https = require('https')
var crypto = require('crypto')

var _ = require('@yoda/util')._
var logger = require('logger')('cloudgw')
var StatusCodeError = require('./status-code-error')

var defaultHost = 'apigwrest.open.rokid.com'
var signKeys = [ 'key', 'device_type_id', 'device_id', 'service', 'version', 'time', 'secret' ]
var authKeys = [ 'version', 'time', 'sign', 'key', 'device_type_id', 'device_id', 'service' ]

/**
 * @typedef Config
 * @property {string} key
 * @property {string} secret
 * @property {string} deviceTypeId
 * @property {string} deviceId
 */

/**
 * @private
 * @param {Object} obj
 */
function genSign (obj) {
  var data = signKeys.map(key => `${key}=${obj[key]}`).join('&')
  return crypto.createHash('md5')
    .update(data)
    .digest('hex')
    .toUpperCase()
}

/**
 * @private
 * @param {module:@yoda/cloudgw~Config} options
 * @param {String} options.service
 */
function getAuth (options) {
  var data = {
    key: options.key,
    secret: options.secret,
    device_type_id: options.deviceTypeId,
    device_id: options.deviceId,
    service: options.service,
    version: '1',
    time: Math.floor(Date.now() / 1000)
  }
  data['sign'] = genSign(data)
  return authKeys
    .map(key => `${key}=${data[key]}`)
    .join(';')
}

function noop () {}

/**
 * @class
 * @param {module:@yoda/cloudgw~Config} config
 */
function Cloudgw (config) {
  ;['key', 'secret', 'deviceTypeId', 'deviceId'].forEach(key => {
    if (typeof _.get(config, key) !== 'string') {
      throw new TypeError(`Expect a string on config.${key}.`)
    }
  })
  this.config = config
}

/**
 *
 * @param {String} path
 * @param {Object} data
 * @param {Object} [options]
 * @param {String} [options.host]
 * @param {String} [options.service]
 * @param {Function} callback
 */
Cloudgw.prototype.request = function request (path, data, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }
  if (options == null) {
    options = {}
  }
  if (typeof callback !== 'function') {
    callback = noop
  }

  var host = options.host || defaultHost

  data = JSON.stringify(data)
  logger.info(`request https://${host}${path}`)
  var authorization = getAuth(Object.assign({}, options, this.config))
  var req = https.request({
    method: 'POST',
    host: host,
    path: path,
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/json;charset=utf-8',
      'Content-Length': data.length
    }
  }, res => {
    var bufs = []
    res.on('data', chunk => bufs.push(chunk))
    res.on('end', onResponse)

    function onResponse () {
      var body = Buffer.concat(bufs).toString()
      if (res.statusCode !== 200) {
        callback(new StatusCodeError(res.statusCode, body, res))
        return
      }
      try {
        body = JSON.parse(body)
      } catch (err) {
        err.message = `Failed to parse response data. ${err.message}`
        callback(err)
      }
      callback(null, body)
    }
  })

  req.on('error', err => {
    callback(err)
  })
  req.end(data)
}

module.exports = Cloudgw
