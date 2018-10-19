'use strict'
// create by yuna.li
var crypto = require('crypto')
var https = require('https')
var logger = require('logger')('alarm')
var DEFAULT_HOST = require('@yoda/env')().skills.alarmUri
var DEFAULT_URI = '/skill-alarm/alarm/operate'
var id = 0

function createMd5 (extraData) {
  return crypto.createHash('md5')
    .update(extraData.deviceId + extraData.deviceTypeId)
    .digest('hex')
    .toUpperCase()
}
function request (params) {
  params.activity.get()
    .then(extraData => {
      id++
      var data = {
        deviceId: extraData.deviceId,
        deviceType: extraData.deviceTypeId,
        intent: params.intent,
        masterId: extraData.masterId,
        nonce: extraData.deviceId + (new Date()).getTime() + id,
        requestTimestamp: (new Date()).getTime(),
        sessionId: (new Date()).getTime(),
        sign: createMd5(extraData),
        signMethod: 'MD5',
        businessParams: params.businessParams || {}
      }
      data = Buffer.from(JSON.stringify(data))
      var req = https.request({
        method: 'POST',
        host: DEFAULT_HOST,
        path: DEFAULT_URI || params.url,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }, (res) => {
        var list = []
        res.on('data', (chunk) => list.push(chunk))
          .on('end', () => {
            var result = Buffer.concat(list).toString()
            if (res.statusCode !== 200) {
              logger.error(`Error: failed get data with ${result}`)
            } else {
              if (typeof params.callback === 'function') {
                params.callback(result)
              }
            }
          })
      })

      req.on('error', (err) => {
        logger.error(err && err.stack)
      })
      req.write(data)
      req.end()
    })
}

module.exports = request
