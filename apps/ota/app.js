'use strict'

var _ = require('@yoda/util')._
var ota = require('@yoda/ota')
var system = require('@yoda/system')
var logger = require('logger')('otap')

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
      return activity.tts.speak('什么升级')
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
        forceUpgrade(activity, url)
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
    return activity.tts.speak('开始系统升级，这会需要⼀些时间，请耐⼼等待。请不要拔插电源，现在为你重启安装，成功升级后会及时告诉你')
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
 * @param {URL} url
 */
function onFirstBootAfterUpgrade (activity, url) {
  ota.resetOta(function onReset (err) {
    if (err) {
      logger.error('Unexpected error on reset ota', err.stack)
    }
  })
}

/**
 *
 * @param {YodaRT.Activity} activity
 * @param {URL} url
 */
function forceUpgrade (activity, url) {
  activity.tts.speak('嗨，收到重要升级，你可以在⼿机APP上了解升级内容，现在， 请保持电源连接，即将开始系统升级')
    .then(() => system.reboot())
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
