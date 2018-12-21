'use strict'

var crypto = require('crypto')
var https = require('https')
var logger = require('logger')('datacollection')
var DEFAULT_HOST = require('@yoda/env')().datacollection.uploadUrl
// var DEFAULT_HOST = 'das-tc-service-test.rokid.com'
var DEFAULT_URI = '/das-tracing-collection/tracingUpload'
var property = require('@yoda/property')

function _createMd5(rokidId, nonce) {
  return crypto.createHash('md5')
    .update(rokidId + 'apiVersion1.0.0' + 'nonce' + nonce + rokidId)
    .digest('hex')
    .toUpperCase()
}

/**
  * Upload buried data
  * @function upload
  * @param {object Array} params - One or more detailed buried point data.
  *  Must include the eventId, eventName, eventType.
  *  - eventId: defined by the product.
  *  - eventName: defined by the product.
  *  - eventType: 0 basic data, 1 system events, 2 application events, 3 log event.
  * @example
  * dataCollection([{{"eventId":"datacollection-test","eventName":"datacollection-test","eventType":1,"extraKvs":{},"keys":{}}])
  */
function upload(params) {
  logger.debug(JSON.stringify(params))
  if (Object.prototype.toString.call(params) !== '[object Array]') {
    logger.error('Error: params is not an object Array')
    return
  }
  var rokidId = property.get('ro.boot.serialno')
  var rokidDtId = property.get('ro.boot.devicetypeid')
  var timestamp = (new Date()).getTime().toFixed(0)
  var common = {
    osVersion: property.get('ro.rokid.build.nativesystem'),
    session: rokidId,
    timestamp: timestamp,
    rokidDtId: rokidDtId
  }
  params.forEach(function (v) {
    Object.assign(v, common)
  });

  var nonce = rokidId + timestamp
  var body = {
    requestId: nonce,
    nonce: nonce,
    sign: _createMd5(rokidId, nonce),
    signMethod: 'MD5',
    apiVersion: '1.0.0',
    eventSrc: 1,
    rokidId: rokidId,
    rokidDtId: rokidDtId,
    data: params || []
  }
  body = Buffer.from(JSON.stringify(body))

  var req = https.request({
    method: 'POST',
    host: DEFAULT_HOST,
    path: DEFAULT_URI,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    }
  }, (res) => {
    var list = []
    res.on('success', (chunk) => list.push(chunk))
      .on('end', () => {
        var result = Buffer.concat(list).toString()
        if (res.statusCode !== 200) {
          logger.error(`Error: failed get data with ${result}`)
        }
      })
  })

  req.on('error', (err) => {
    logger.error(err && err.stack)
  })
  req.write(body)
  req.end()
}

module.exports = upload

