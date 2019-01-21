'use strict'
var levels = require('logger').levels
var setGlobalUploadLevel = require('logger').setGlobalUploadLevel
var logger = require('logger')('log-switch')
var cloudgw = require('@yoda/cloudgw')
var property = require('@yoda/property')
var _ = require('@yoda/util')._
var persistKey = 'log.cloud.level'
var expireKey = 'log.cloud.expire'
var switchDefaultTimeout = 60 * 1000
var defaultLevel = levels.info

module.exports = function (activity) {
  activity.on('ready', () => {
    var level = parseInt(property.get(persistKey, 'persist'))
    var expire = parseInt(property.get(expireKey, 'persist'))
    var timeout
    logger.info(`cloud log init level: ${level}, expire at ${expire}`)
    if (!level) {
      level = defaultLevel
    }
    if (expire) {
      timeout = expire - Date.now()
      // the previous level was expired, revert to default level
      if (timeout < 1) {
        timeout = undefined
        level = defaultLevel
      }
    }
    onCloudLogLevelSwitch(activity, level, timeout)
  })
  activity.on('request', (nlp, action) => {
    if (nlp.intent === 'RokidAppChannelForward') {
      var level = _.get(nlp, 'forwardContent.intent', 0)
      var timeout = _.get(nlp, 'forwardContent.slots.timeout', 0)
      onCloudLogLevelSwitch(activity, level, timeout)
    }
  })
}

function onCloudLogLevelSwitch (activity, level, timeout) {
  logger.info(`cloud logger switch to ${level}, timeout ${timeout}ms`)
  if (levels.verbose <= level && level <= levels.error) {
    if (level !== defaultLevel) {
      // level not equal to defaultLevel must set timeout
      if (!timeout) {
        timeout = switchDefaultTimeout
      }
      setTimeout(() => {
        onCloudLogLevelSwitch(activity, defaultLevel)
      }, timeout)
    } else {
      timeout = undefined
    }
    activity.get().then(config => {
      setLevel(level, config, timeout)
    }, err => {
      logger.error('cloud log update conf error', err)
    })
  } else {
    setLevel(levels.none, undefined, timeout)
  }
}

function setLevel (level, config, timeout) {
  var expire = timeout + Date.now()
  logger.info(`set cloud level ${level}`)
  var authorization
  if (level !== levels.none) {
    authorization = cloudgw.getAuth(config)
  }

  try {
    setGlobalUploadLevel(level, authorization)
    property.set(persistKey, level, 'persist')
    property.set(expireKey, expire || 0, 'persist')
  } catch (err) {
    logger.error('set upload level error', err)
  }
}
