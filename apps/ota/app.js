'use strict'

var ota = require('@yoda/ota')
var system = require('@yoda/system')
var logger = require('logger')('otap')

var intentHandler = {
  start_sys_upgrade: checkUpdateAvailability,
  check_sys_upgrade: checkUpdateAvailability,
  check_upgrade_num: whatsCurrentVersion
}

module.exports = function (activity) {
  activity.on('onrequest', function (nlp, action) {
    var handler = intentHandler[nlp.intent]
    if (handler == null) {
      activity.tts.speak('什么升级', () => activity.exit())
      return
    }
    logger.info(`OtaApp got nlp ${nlp.intent}`)
    handler(activity)
  })
}

function checkUpdateAvailability (activity) {
  ota.getAvailableInfo(function onInfo (error, info) {
    if (error) {
      logger.error('Unexpected error on check available updates', error.stack)
    }
    if (error || info == null) {
      activity.tts.speak('已经是最新的系统版本了', () => activity.exit())
      return
    }
    if (info.status !== 'downloaded') {
      ota.runInBackground()
      activity.tts.speak('你有新的版本可以升级，下载马上可以完成', () => activity.exit())
      return
    }
    var result = isUpgradeSuitableNow()
    if (result !== true) {
      // TODO: device not available for upgrade
    }
    var ret = system.prepareOta(info)
    if (ret !== 0) {
      activity.tts.speak('准备升级失败', () => activity.exit())
      return
    }
    activity.tts.speak('你有新的版本可以升级，现在为你重启安装，成功升级后会及时告诉你', () => {
      system.reboot()
    })
  }) /** ota.getAvailableInfo */
}

function whatsCurrentVersion (activity) {
  activity.tts.speak('你可以在手机app的设备信息页面看到我现在的系统版本号', () => activity.exit())
}

function isUpgradeSuitableNow () {
  // TODO: check battery availability
  return true
}
