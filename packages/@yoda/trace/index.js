'use strict'

var crypto = require('crypto')
var httpsession = require('@yoda/httpsession')
var _ = require('@yoda/util')._
var logger = require('logger')('trace')
var DEFAULT_HOST = require('@yoda/env')().trace.uploadUrl
var DEFAULT_URI = '/das-tracing-collection/tracingUpload'
var property = require('@yoda/property')

function _createMd5 (rokidId, nonce) {
  return crypto.createHash('md5')
    .update(rokidId + 'apiVersion1.0.0' + 'nonce' + nonce + rokidId)
    .digest('hex')
    .toUpperCase()
}

/**
 * @typedef trace
 * @property {string} eventId
 * @property {string} eventName
 * @property {number} eventType
 * @property {string} rokidDtId
 * @property {string} k
 * @property {string} v
 * @property {Object} extraKvs
 */

/**
  * Upload buried data
  * @function upload
  * @param {module:@yoda/trace~trace[]} traces - buried point data.
  * @example
  * upload([{"rokidDtId":"0ABA0AA4F71949C4A3FB0418BF025113","eventId":"datacollection-test",
  *  "eventName":"datacollection-test","eventType":1,"extraKvs":{},"k0":"test","v0":"test"}])
  */
function upload (traces) {
  if (!(Array.isArray(traces))) {
    logger.error('Error: traces is not an object Array')
    throw new TypeError('Expect a object Array on traces.')
  }
  if (traces.length === 0) {
    logger.debug('traces length is 0!')
    throw new TypeError('Expect traces length greater than 0.')
  }
  var deviceTypeId = _.get(traces, '0.rokidDtId')
  if (typeof path !== 'string' || deviceTypeId.trim() === '') {
    deviceTypeId = property.get('ro.boot.devicetypeid')
  }
  var deviceId = property.get('ro.boot.serialno')
  var timestamp = Date.now().toFixed(0)
  var common = {
    osVersion: property.get('ro.build.version.release'),
    session: deviceId,
    timestamp: timestamp
  }

  // add common base data
  traces.forEach(function (v) {
    Object.assign(v, common)
  })

  var nonce = deviceId + timestamp
  var body = {
    requestId: nonce,
    nonce: nonce,
    sign: _createMd5(deviceId, nonce),
    signMethod: 'MD5',
    apiVersion: '1.0.0',
    eventSrc: 1,
    rokidId: deviceId,
    rokidDtId: deviceTypeId,
    data: traces || []
  }

  var options = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'text/plain;charset=utf-8',
      'Content-Length': body.length
    }
  }
  httpsession.request(DEFAULT_HOST + DEFAULT_URI, options, (err, res) => {
    if (err) {
      logger.error(err && err.stack)
      throw new Error(`Error: request failed ${err}`)
    }
    if (res.code !== 200) {
      logger.error(`Error: failed get data with ${res}`)
      throw new Error(`Error: failed get data with ${res}`)
    }
  })
}

module.exports = upload
