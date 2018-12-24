'use strict'
var DISABLE_LEVEL = require('@yoda/logger').UPLOAD_DISABLE_LEVEL
var MIN_LEVEL = require('@yoda/logger').UPLOAD_MIN_LEVEL
var MAX_LEVEL = require('@yoda/logger').UPLOAD_MAX_LEVEL
var setGlobalUploadLevel = require('@yoda/logger').setGlobalUploadLevel
var logger = require('@yoda/logger')('log-switch')
var cloudgw = require('@yoda/cloudgw')

module.exports = function (activity) {
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
    setGlobalUploadLevel(level)
  } else if (MIN_LEVEL <= level && level <= MAX_LEVEL) {
    activity.get().then(config => {
      var authorization = cloudgw.getAuth(config)
      setGlobalUploadLevel(level, authorization)
      logger.info(`cloud logger switch to ${level} done`)
    }).then(err => {
      logger.error(`cloud logger switch to ${level} error`, err)
    })
  } else {
    logger.error(`unknown switch level ${level}`)
  }
}
