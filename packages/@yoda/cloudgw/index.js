'use strict'

/**
 * Cloud API request library.
 * @module @yoda/cloudgw
 */

var https = require('https')
var crypto = require('crypto')

var StatusCodeError = require('./status-code-error')

var config = null

var defaultHost = 'apigwrest.open.rokid.com'
var signKeys = [ 'key', 'device_type_id', 'device_id', 'service', 'version', 'time', 'secret' ]
var authKeys = [ 'version', 'time', 'sign', 'key', 'device_type_id', 'device_id', 'service' ]

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
 * @param {Object} [options]
 * @param {String} [options.service]
 */
function getAuth (options) {
  if (config === null) {
    throw new Error('cloudgw not initialized')
  }
  var data = {
    key: config.key,
    secret: config.secret,
    device_type_id: config.deviceTypeId,
    device_id: config.deviceId,
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
 *
 * @param {String} path
 * @param {Object} data
 * @param {Object} [options]
 * @param {String} [options.host]
 * @param {String} [options.service]
 * @param {Function} callback
 */
function request (path, data, options, callback) {
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
  var authorization = getAuth(options)
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

/**
 * @member {Object} config
 */
Object.defineProperty(module.exports, 'config', {
  get: function get () {
    return config
  },
  set: function set (val) {
    config = Object.assign({}, config, val)
  }
})
module.exports.request = request
