'use strict'

var ota = require('@yoda/ota')
var system = require('@yoda/system')
var logger = require('logger')('otap')

var intentHandler = {
  start_sys_upgrade: checkUpdateAvailability,
  check_sys_upgrade: checkUpdateAvailability,
  check_upgrade_num: whatsCurrentVersion,
  /**
   * Generated NLP
   */
  on_first_boot_after_upgrade: onFirstBootAfterUpgrade,
  force_upgrade: forceUpgrade
}

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (activity) {
  activity.on('request', function (nlp, action) {
    var handler = intentHandler[nlp.intent]
    if (handler == null) {
      return activity.tts.speak('什么升级')
        .then(() => activity.exit())
    }
    logger.info(`OtaApp got nlp ${nlp.intent}`)
    handler(activity, nlp, action)
  })
}

/**
 *
 * @param {YodaRT.Activity} activity
 */
function checkUpdateAvailability (activity) {
  logger.info('fetching available ota info')
  ota.getAvailableInfo(function onInfo (error, info) {
    if (error) {
      logger.error('Unexpected error on check available updates', error.stack)
    }
    if (error || info == null) {
      return activity.tts.speak('已经是最新的系统版本了')
        .then(() => activity.exit())
    }
    if (info.status !== 'downloaded') {
      ota.runInBackground()
      return activity.tts.speak('你有新的版本可以升级，下载马上可以完成')
        .then(() => activity.exit())
    }
    var result = isUpgradeSuitableNow()
    if (result !== true) {
      // TODO: device not available for upgrade
      return
    }
    logger.info(`using ota image ${info.imagePath}`)
    var ret = system.prepareOta(info.imagePath)
    if (ret !== 0) {
      return activity.tts.speak('准备升级失败')
        .then(() => activity.exit())
    }
    return activity.tts.speak('你有新的版本可以升级，现在为你重启安装，成功升级后会及时告诉你')
      .then(() => system.reboot())
  }) /** ota.getAvailableInfo */
}

/**
 *
 * @param {YodaRT.Activity} activity
 */
function whatsCurrentVersion (activity) {
  activity.tts.speak('你可以在手机app的设备信息页面看到我现在的系统版本号')
    .then(() => activity.exit())
}

function isUpgradeSuitableNow () {
  // TODO: check battery availability
  return true
}

/**
 *
 * @param {YodaRT.Activity} activity
 * @param {YodaRT.Request} nlp
 */
function onFirstBootAfterUpgrade (activity, nlp) {
  var info = nlp._info
  if (info == null || !info.changelog) {
    return
  }

  ota.resetOta(function onReset () {
    activity.tts.speak(info.changelog)
      .then(() => activity.exit())
  })
}

/**
 *
 * @param {YodaRT.Activity} activity
 * @param {YodaRT.Request} nlp
 */
function forceUpgrade (activity, nlp) {
  var info = nlp._info
  if (info == null || !info.changelog) {
    return
  }
  activity.tts.speak(info.changelog)
    .then(() => system.reboot())
}
