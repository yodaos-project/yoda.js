'use strict'
var logger = require('logger')('bluetooth-app')
var httpsession = require('@yoda/httpsession')
var crypto = require('crypto')
var id = 0
var requestInfo = require('./config.json').REQUEST_INFO

function md5 (str) {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase()
}

function sign (requestInfo) {
  return md5(requestInfo.sessionId +
    'masterId' + requestInfo.masterId +
    'deviceId' + requestInfo.deviceId +
    'domain' + requestInfo.domain +
    'intent' + requestInfo.intent +
    'nonce' + requestInfo.nonce +
    requestInfo.sessionId)
}

function getRequestInfo (intent, deviceProps, businessData) {
  var time = Math.floor(Date.now() / 1000)
  requestInfo.masterId = deviceProps.masterId
  requestInfo.deviceId = deviceProps.deviceId
  requestInfo.deviceType = deviceProps.deviceTypeId
  requestInfo.businessParams = businessData || {}
  requestInfo.requestTimestamp = time
  requestInfo.intent = intent
  requestInfo.nonce = deviceProps.deviceId + time + `${id++}`
  requestInfo.requestId = time
  requestInfo.sessionId = time
  var signMd5 = sign(requestInfo)
  requestInfo.sign = signMd5
  return requestInfo
}

function sendRequest (url, params, timeoutSecs) {
  var reqBody = JSON.stringify(params)
  return new Promise((resolve, reject) => {
    var options = {
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      method: 'POST',
      timeout: timeoutSecs || 10,
      body: reqBody
    }
    var callback = function (err, response) {
      logger.log('response:', err, response)
      if (err || !response || response.code !== 200) {
        return reject(err)
      }
      try {
        var obj = JSON.parse(response.body)
        return resolve(obj)
      } catch (err) {
        return reject(err)
      }
    }
    httpsession.request(url, options, callback)
    logger.debug('sent, waiting for resp.')
  })
}

module.exports.getRequestInfo = getRequestInfo
module.exports.sendRequest = sendRequest
