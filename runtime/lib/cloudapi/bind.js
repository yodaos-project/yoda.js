'use strict'

var https = require('https')
var crypto = require('crypto')
var logger = console
var property = require('@yoda/property')
var Cloudgw = require('@yoda/cloudgw')
var env = require('../env')()

function md5 (str) {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase()
}

var CONFIG = null
var login = require('./login')
var retry = 0

function deviceManager (config, pathname, callback) {
  if (retry > 10) {
    return callback(new Error(`${pathname} failed after retry 10`))
  }
  logger.log('start request', pathname)

  var cloudgw = new Cloudgw(config)
  var userId = property.get('persist.system.user.userId') || ''
  cloudgw.request(pathname,
    { userId: userId },
    { service: 'bindMaster' },
    function onResponse (err, body) {
      if (err) {
        logger.log(`${pathname} fail and retry ${err}`)
        retry += 1
        setTimeout(deviceManager.bind(null, config, pathname, callback), 3000)
        return
      }

      if (!body.resultCode) {
        logger.log(`${pathname} -> response ok`)
        callback(null, config)
      } else {
        logger.error(`${pathname} -> response ${body.message} ${body.resultCode}`)
        callback(new Error(`BindMaster fail ${body.message}`))
      }
    }) /** cloudgw.request */
}

function loginAndBindDevice (onEvent, callback) {
  login(onEvent).then((config) => {
    CONFIG = config
    onEvent('200', '绑定中')
    deviceManager(config, '/v1/device/deviceManager/bindMaster', (err, config) => {
      if (err) {
        onEvent('-201', '绑定失败')
        callback(err)
      } else {
        onEvent('201', '绑定成功')
        callback(null, config)
      }
    })
  }).catch(callback)
}

function bindDevice (onEvent) {
  return new Promise((resolve, reject) => {
    loginAndBindDevice(onEvent, (err, config) => {
      if (err) {
        reject(err)
      } else {
        resolve(config)
      }
    })
  })
}

function unBindDevice () {
  return new Promise((resolve, reject) => {
    if (CONFIG) {
      deviceManager(CONFIG, '/v1/device/deviceManager/unBindMaster', (err, config) => {
        if (err) {
          reject(err)
        } else {
          resolve(config)
        }
      })
    } else {
      login().then((config) => {
        deviceManager(config, '/v1/device/deviceManager/unBindMaster', (err, config) => {
          if (err) {
            reject(err)
          } else {
            resolve(config)
          }
        })
      })
    }
  })
}

exports.bindDevice = bindDevice
exports.unBindDevice = unBindDevice
