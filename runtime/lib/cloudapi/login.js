'use strict'

var https = require('https')
var qs = require('querystring')
var crypto = require('crypto')
var exec = require('child_process').exec
var sync = require('../date-sync').sync
var property = require('@yoda/property')
var logger = require('logger')('login')
var env = require('@yoda/env')()

var uuid = property.get('ro.boot.serialno')
var seed = property.get('ro.boot.rokidseed')
var secret = null
var retry = 0

function md5 (str) {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase()
}

function login (callback) {
  if (!uuid || !seed) {
    callback(new Error('expect uuid and seed'))
    return
  }
  logger.debug(`exe test-stupid ${seed} ${uuid}`)
  exec('test-stupid ' + seed + ' ' + uuid, {
    encoding: 'buffer'
  }, function (error, stdout, stderr) {
    if (error) {
      logger.error('exe error', error)
      callback(error)
      return
    }
    var _seed = stdout
    logger.debug(`exec result: ${_seed.toString('base64')}`)
    secret = md5(_seed.toString('base64'))
    if (!secret) {
      return callback(new Error('can not get secret'))
    }
    var config = {
      device_type_id: property.get('ro.boot.devicetypeid')
    }
    var type = config['device_type_id'] || ''
    if (type === 'rokid_test_type_id') {
      type = ''
    }
    var time = Math.floor(Date.now() / 1000)
    var sign = md5(`${secret}${type}${uuid}${time}${secret}`)
    var userId = property.get('app.network.masterId') || undefined

    var opts = {
      deviceId: uuid,
      deviceTypeId: type || undefined,
      time: time,
      sign: sign,
      namespaces: 'basic_info,custom_config'
    }
    if (userId) {
      opts.userId = userId
      property.set('app.network.masterId', '')
    }
    var params = qs.stringify(opts)
    logger.log('start /login request')

    var req = https.request({
      method: 'POST',
      host: env.cloudgw.account,
      path: '/device/loginV2.do',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': params.length
      }
    }, (response) => {
      // sync date from service
      sync(response.headers.date)

      var list = []
      response.on('data', (chunk) => list.push(chunk))
      response.once('end', () => {
        var contents = Buffer.concat(list).toString()
        try {
          var body = JSON.parse(contents)
          if (!body.success) {
            var err = new Error(body.msg || 'request error')
            err.code = body.code
            callback(err)
          } else {
            var data = JSON.parse(body.data)
            config.deviceId = data.deviceId
            config.deviceTypeId = data.deviceTypeId
            config.key = data.key
            config.secret = data.secret
            config.extraInfo = data.extraInfo
            callback(null, config)
          }
        } catch (err) {
          logger.error(err && err.stack)
          callback(err)
        }
      })
    })
    req.on('error', (err) => {
      logger.log('login request error', err)
      if (retry <= 2) {
        retry += 1
        logger.info('invalid certificate, try again once')
        return setTimeout(() => login(callback), 3000)
      } else {
        callback(err)
      }
    })
    req.write(params)
    req.end()
  })
}

module.exports = function () {
  return new Promise((resolve, reject) => {
    login((err, data) => {
      err ? reject(err) : resolve(data)
    })
  })
}
