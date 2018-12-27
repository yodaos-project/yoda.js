'use strict'

/**
 * @module @yoda/trace
 */

var crypto = require('crypto')
var httpsession = require('@yoda/httpsession')
var _ = require('@yoda/util')._
var DEFAULT_HOST = require('@yoda/env')().trace.uploadUrl
var DEFAULT_URI = '/das-tracing-collection/tracingUpload'
var property = require('@yoda/property')
var deviceId = property.get('ro.boot.serialno')
var releaseVersion = property.get('ro.build.version.release')
var defaultDeviceTypeId = property.get('ro.boot.devicetypeid')

function _createMd5 (id, nonce) {
  return crypto.createHash('md5')
    .update(id + 'apiVersion1.0.0' + 'nonce' + nonce + id)
    .digest('hex')
    .toUpperCase()
}

/**
 * @typedef trace
 * @property {string} eventId - defined by the product.
 * @property {string} eventName - defined by the product.
 * @property {number} eventType - 0 basic data, 1 system events, 2 application events, 3 log event.
 * @property {string} rokidDtId - unique device identification.
 * @property {string} k - the k defined by the product, from 0 to 9, exceeds the use of extraKvs.
 * @property {string} v - that corresponds to k one by one.
 * @property {object} extraKvs - extension.
 */

/**
  * Upload buried data, failure to throw an exception, no callback.
  * @function upload
  * @param {module:@yoda/trace~trace[]} traces - buried point data.
  * @example
  * upload([{"rokidDtId":"rokidDtId","eventId":"datacollection-test","eventName":"datacollection-test",
  * "eventType":1,"extraKvs":{},"k0":"test","v0":"test"}])
  */
function upload (traces) {
  if (!Array.isArray(traces)) {
    throw new TypeError('Expect a object Array on traces.')
  }
  if (traces.length === 0) {
    throw new Error('Expect traces length greater than 0.')
  }
  var deviceTypeId = _.get(traces, '0.rokidDtId')
  if (typeof deviceTypeId !== 'string' || deviceTypeId.trim() === '') {
    deviceTypeId = defaultDeviceTypeId
  }
  var timestamp = Date.now().toFixed(0)
  var common = {
    osVersion: releaseVersion,
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
      'Content-Type': 'text/plain;charset=utf-8'
    }
  }
  var req = httpsession.request(DEFAULT_HOST + DEFAULT_URI, options, (err, res) => {
    if (err) {
      throw new Error(`Error: request failed ${err}`)
    }
    if (res.code !== 200) {
      throw new Error(`Error: failed get data with ${res}`)
    }
  })
  req.end()
}

module.exports = upload
