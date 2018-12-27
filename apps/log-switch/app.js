'use strict'
var DISABLE_LEVEL = require('logger').UPLOAD_DISABLE_LEVEL
var MIN_LEVEL = require('logger').UPLOAD_MIN_LEVEL
var MAX_LEVEL = require('logger').UPLOAD_MAX_LEVEL
var setGlobalUploadLevel = require('logger').setGlobalUploadLevel
var logger = require('logger')('log-switch')
var cloudgw = require('@yoda/cloudgw')
var property = require('@yoda/property')
var persistKey = 'log.cloud.level'

module.exports = function (activity) {
  activity.on('ready', () => {
    var level = property.get(persistKey, 'persist')
    logger.info(`cloud log init level: ${level}`)
    if (!level) {
      level = MIN_LEVEL
    }
    onCloudLogLevelSwitch(activity, level)
  })
  activity.on('request', (nlp, action) => {
    if (nlp.intent === 'RokidAppChannelForward') {
      var level = nlp.forwardContent.intent
      onCloudLogLevelSwitch(activity, level)
    }
  })
}

function onCloudLogLevelSwitch (activity, level) {
  level = parseInt(level)
  logger.info(`cloud logger switch to ${level}`)
  if (MIN_LEVEL <= level && level <= MAX_LEVEL) {
    activity.get().then(config => {
      setLevel(level, config)
    }, err => {
      logger.error('cloud log update conf error', err)
    })
  } else {
    setLevel(DISABLE_LEVEL)
  }
}

function setLevel (level, config) {
  logger.info(`set cloud level ${level}`)
  var authorization
  if (level !== DISABLE_LEVEL) {
    authorization = cloudgw.getAuth(config)
  }

  try {
    setGlobalUploadLevel(level, authorization)
  } catch (err) {
    logger.error('set upload level error', err)
  }
  property.set(persistKey, level, 'persist')
}
