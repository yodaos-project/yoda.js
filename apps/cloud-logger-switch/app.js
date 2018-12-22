'use strict'
var Logger = require('@yoda/logger')
var logger = Logger('cloud-logger-switch')
var cloudgw = require('@yoda/cloudgw')

module.exports = function (activity) {
  activity.on('request', function (nlp, action) {
    if (nlp.intent === 'RokidAppChannelForward') {
      onCloudLogLevelSwitch(nlp)
    }
  })
}

function onCloudLogLevelSwitch (nlp) {
  var uploadLevel = parseInt(nlp.forwardContent.intent)
  logger.info(`cloud logger switch to ${uploadLevel}`)
  activity.get().then(config => {
    var authorization = cloudgw.getAuth(config)
    Logger.setGlobalUploadLevel(uploadLevel, authorization)
    logger.info(`cloud logger switch to ${uploadLevel} done`)
  }).then(err => {
    logger.error(`cloud logger switch to ${uploadLevel} error`, err)
  })
}