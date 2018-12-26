'use strict'
var DISABLE_LEVEL = require('@yoda/logger').UPLOAD_DISABLE_LEVEL
var MIN_LEVEL = require('@yoda/logger').UPLOAD_MIN_LEVEL
var MAX_LEVEL = require('@yoda/logger').UPLOAD_MAX_LEVEL
var setGlobalUploadLevel = require('@yoda/logger').setGlobalUploadLevel
var logger = require('@yoda/logger')('log-switch')
var cloudgw = require('@yoda/cloudgw')
var config = null

module.exports = function (activity) {
  activity.on('ready', () => {
    updateConfig(activity)
  })
  activity.on('request', function (nlp, action) {
    if (nlp.intent === 'RokidAppChannelForward') {
      onCloudLogLevelSwitch(activity, nlp)
    }
  })
}

function onCloudLogLevelSwitch (activity, nlp) {
  var level = parseInt(nlp.forwardContent.intent)
  logger.info(`cloud logger switch to ${level}`)
  if (level === DISABLE_LEVEL) {
    setGlobalUploadLevel(DISABLE_LEVEL)
  } else if (MIN_LEVEL <= level && level <= MAX_LEVEL) {
    if (config) {
      var authorization = cloudgw.getAuth(config)
      setGlobalUploadLevel(level, authorization)
      logger.info(`cloud logger switch to ${level} done`)
    } else {
      logger.error('cloud logger config is not inited')
    }
  } else {
    logger.error(`unknown switch level ${level}`)
  }
}

function updateConfig (activity) {
  return activity.get().then(conf => {
    logger.info('cloud log updated conf')
    config = conf
  }).then(err => {
    logger.error('cloud log update conf error', err)
  })
}
