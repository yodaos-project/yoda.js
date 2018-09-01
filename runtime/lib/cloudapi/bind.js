'use strict'

var property = require('@yoda/property')
var Cloudgw = require('@yoda/cloudgw')
var logger = require('logger')('bind')

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

function loginAndBindDevice (callback) {
  login().then((config) => {
    CONFIG = config
    deviceManager(config, '/v1/device/deviceManager/bindMaster', callback)
  }).catch(callback)
}

function bindDevice () {
  return new Promise((resolve, reject) => {
    loginAndBindDevice((err, config) => {
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
