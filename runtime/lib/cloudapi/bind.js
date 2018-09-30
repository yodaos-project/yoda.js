'use strict'

var property = require('@yoda/property')
var Cloudgw = require('@yoda/cloudgw')
var logger = require('logger')('bind')
var strings = require('../../strings/login.json')
var login = require('./login')

var CONFIG = null
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

function bindDevice (notify) {
  notify('100', strings.LOGIN_DOING)
  return login()
    .then((config) => {
      // copy config to global variable for unBindDevice function
      CONFIG = Object.assign({}, config)
      var basicInfo = null
      try {
        basicInfo = JSON.parse(CONFIG.extraInfo.basic_info)
        if (!basicInfo.master) {
          throw new Error('bind master is required')
        } else {
          CONFIG.masterId = basicInfo.master
        }
      } catch (_) {
        var err = new Error('bind master is required')
        err.code = 'BIND_MASTER_REQUIRED'
        throw err
      }
    })
    .then(() => {
      notify('101', strings.LOGIN_DONE)
      notify('201', strings.BIND_MASTER_DONE)
      return CONFIG
    })
    .catch((err) => {
      if (err.code === 'BIND_MASTER_REQUIRED') {
        throw err
      }
      if (err.code === '100006' || err.code === '100007') {
        notify('101', strings.LOGIN_DONE)
        notify('-201', strings.BIND_MASTER_FAILURE)
      } else {
        notify('-101', strings.LOGIN_FAILURE)
      }
      throw err
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
