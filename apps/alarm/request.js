'use strict'
// create by yuna.li
var crypto = require('crypto')
var https = require('https')
var logger = require('logger')('alarm-request')
var DEFAULT_HOST = require('@yoda/env')().skills.alarmUri
var DEFAULT_URI = '/skill-alarm/alarm/operate'
var id = 0

function _createMd5 (extraData) {
  return crypto.createHash('md5')
    .update(extraData.deviceId + extraData.deviceTypeId)
    .digest('hex')
    .toUpperCase()
}

function request (params) {
  params.activity.get()
    .then(extraData => {
      try {
        id++
        var curTime = (new Date()).getTime()
        var data = {
          deviceId: extraData.deviceId,
          deviceType: extraData.deviceTypeId,
          intent: params.intent,
          masterId: extraData.masterId,
          nonce: extraData.deviceId + curTime + id,
          requestTimestamp: curTime,
          sessionId: curTime,
          sign: _createMd5(extraData),
          signMethod: 'MD5',
          businessParams: params.businessParams || {}
        }
        data = Buffer.from(JSON.stringify(data))
        var callback = (err, result) => {
          if (typeof params.callback === 'function') {
            params.callback(err, result)
          }
        }
        var req = https.request({
          method: 'POST',
          host: DEFAULT_HOST,
          path: params.url || DEFAULT_URI,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        }, (res) => {
          if (res.statusCode !== 200) {
            logger.error(`Error: failed get data with statusCodse ${res.statusCode}`)
            callback(res.statusCode)
            return
          }
          var list = []
          res.on('data', (chunk) => list.push(chunk))
            .on('end', () => {
              var result = Buffer.concat(list).toString()
              callback(null, result)
            })
        })

        req.on('error', (err) => {
          logger.error('request on Error: ', err && err.stack)
          callback(err)
        })
        req.write(data)
        req.end()
      } catch (err) {
        logger.error('request exception: ', err && err.stack)
        callback(err)
      }
    })
}

module.exports = request
