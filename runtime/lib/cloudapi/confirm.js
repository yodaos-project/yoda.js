'use strict'

var https = require('https')
var logger = require('logger')('sendConfirm')
var getAuth = require('./getAuth')
var env = require('@yoda/env')()

var DEFAULT_HOST = env.cloudgw.restful
var DEFAULT_URI = '/v1/skill/dispatch/setConfirm'

function request (appId, intent, slot, options, attrs, config, callback) {
  if (config === null || config === undefined) {
    callback(new Error('config required'))
    return
  }
  var data = {
    appId: appId,
    confirmIntent: intent,
    confirmSlot: slot,
    confirmOptions: JSON.stringify(options),
    attributes: JSON.stringify(attrs)
  }
  logger.log('confirm:', data)

  data = JSON.stringify(data)
  var req = https.request({
    method: 'POST',
    host: DEFAULT_HOST,
    path: DEFAULT_URI,
    headers: {
      'Authorization': getAuth(config),
      'Content-Type': 'application/json;charset=utf-8',
      'Content-Length': data.length
    }
  }, (res) => {
    var list = []
    res.on('data', (chunk) => list.push(chunk))
    res.on('end', () => {
      var msg = Buffer.concat(list).toString()
      if (res.statusCode !== 200) {
        logger.error(`Error: failed upload intent ${intent} ${data} with ${msg}`)
        callback(new Error('server response error: ' + msg))
      } else {
        msg = JSON.parse(msg)
        // logger.log(`got ${event} successfully response`, msg);
        if (typeof callback === 'function') {
          callback(null, msg)
        }
      }
    })
  })
  req.on('error', (err) => {
    logger.error(err && err.stack)
    callback(err)
  })
  req.write(data)
  req.end()
};

module.exports = function sendConfirm (appId, intent, slot, options, attrs, config, callback) {
  if (arguments.length !== 7) {
    callback(new Error('arguments wrong'))
    return
  }
  request(appId, intent, slot, options, attrs, config, callback)
}
