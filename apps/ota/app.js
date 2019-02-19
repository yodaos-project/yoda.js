'use strict'

var _ = require('@yoda/util')._
var ota = require('@yoda/ota')
var system = require('@yoda/system')
var logger = require('logger')('otap')
var util = require('util')

var strings = require('./strings.json')

var getAvailableInfoAsync = util.promisify(ota.getAvailableInfo)

var intentHandler = {
  start_sys_upgrade: checkUpdateAvailability,
  check_sys_upgrade: checkUpdateAvailability,
  check_upgrade_num: whatsCurrentVersion
}

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (activity) {
  activity.on('request', function (nlp, action) {
    var intent = nlp.intent
    if (intent === 'RokidAppChannelForward') {
      intent = _.get(nlp, 'forwardContent.intent')
    }
    var handler = intentHandler[intent]
    if (handler == null) {
      return activity.tts.speak(strings.UNKNOWN_INTENT)
        .then(() => activity.exit())
    }
    logger.info(`OtaApp got nlp ${nlp.intent}`)
    handler(activity, nlp, action)
  })

  activity.on('url', function (url) {
    switch (url.pathname) {
      case '/mqtt/check_update':
        mqttCheckUpdate(activity)
        break
      case '/on_first_boot_after_upgrade':
        onFirstBootAfterUpgrade(activity, url)
        break
      case '/force_upgrade':
        startUpgrade(activity, url.query.image_path, true)
        break
    }
  })
}

/**
 *
 * @param {YodaRT.Activity} activity
 */
function checkUpdateAvailability (activity) {
  logger.info('fetching available ota info')
  getAvailableInfoAsync().then(info => {
    if (info == null) {
      return activity.tts.speak(strings.NO_UPDATES_AVAILABLE)
        .then(() => activity.exit())
    }
    if (info.status === 'downloading') {
      return ota.getImageDownloadProgress(info, (err, progress) => {
        if (err) {
          return activity.tts.speak(strings.UPDATES_START_DOWNLOADING)
            .then(() => activity.exit())
        }
        var utterance
        if (isNaN(progress) || progress < 0 || progress >= 100) {
          utterance = strings.UPDATES_START_DOWNLOADING
        } else {
          progress = Math.round(progress * 100)
          utterance = util.format(strings.UPDATES_ON_DOWNLOADING, progress)
        }
        return activity.tts.speak(utterance)
          .then(() => activity.exit())
      })
    }
    if (info.status !== 'downloaded') {
      ota.runInBackground()
      return activity.tts.speak(strings.UPDATES_START_DOWNLOADING)
        .then(() => activity.exit())
    }
    return ota.condition.getAvailabilityOfOta(info)
      .then(availability => {
        switch (availability) {
          case true:
            return startUpgrade(activity, info.imagePath)
          case 'low_power':
            return activity.tts.speak(strings.UPDATE_NOT_AVAILABLE_LOW_POWER)
              .then(() => activity.exit())
          case 'extremely_low_power':
            return activity.tts.speak(strings.UPDATE_NOT_AVAILABLE_EXTREMELY_LOW_POWER)
              .then(() => activity.exit())
          default:
            return activity.tts.speak(strings.NO_UPDATES_AVAILABLE)
              .then(() => activity.exit())
        }
      })
  }, error => {
    logger.error('Unexpected error on check available updates', error.stack)
    return activity.tts.speak(strings.NO_UPDATES_AVAILABLE)
      .then(() => activity.exit())
  })
}

/**
 *
 * @param {YodaRT.Activity} activity
 */
function whatsCurrentVersion (activity) {
  activity.tts.speak(strings.GENERIC_VERSION_ANNOUNCEMENT)
    .then(() => activity.exit())
}

/**
 *
 * @param {YodaRT.Activity} activity
 * @param {URL} url
 */
function onFirstBootAfterUpgrade (activity, url) {
  activity.tts.speak(url.query.changelog || strings.OTA_UPDATE_SUCCESS)
    .then(
      () => activity.exit(),
      err => {
        logger.error('unexpected error on announcing changelog', err.stack)
        activity.exit()
      }
    )
  ota.resetOta(function onReset (err) {
    if (err) {
      logger.error('Unexpected error on reset ota', err.stack)
    }
  })
}

function startUpgrade (activity, imagePath, isForce) {
  logger.info(`using ota image ${imagePath}`)
  var ret = system.prepareOta(imagePath)
  if (ret !== 0) {
    logger.error(`OTA prepared with status code ${ret}, terminating.`)
    return activity.tts.speak(strings.OTA_PREPARATION_FAILED)
      .then(() => activity.exit())
  }
  var media = 'system://ota_start_update.ogg'
  if (isForce) {
    media = 'system://ota_force_update.ogg'
  }
  return activity.media.start(media, { impatient: false })
    .then(() => system.reboot('ota'), err => {
      logger.error('Unexpected error on announcing start update', err.stack)
      system.reboot('ota')
    })
}

function mqttCheckUpdate (activity) {
  ota.getMqttOtaReport(function onReport (error, report) {
    if (error) {
      logger.error('mqtt check update', error)
      return
    }
    if (report.checkCode !== 0 && !report.updateAvailable) {
      ota.runInBackground()
    }
    activity.wormhole.sendToApp('sys_update_available', report)
  })
}
