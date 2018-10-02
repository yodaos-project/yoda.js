'use strict'

var logger = require('logger')('rktimer')
var RKDownTimer = require('./RKDownTimer').RKDownTimer

var POWER = 116
// var MICMUTE = 113
// var VOLUMEUP = 115
// var VOLUMEDOWN = 114

var rkDownTimer = new RKDownTimer()

module.exports = function (activity) {
  rkDownTimer.setActivity(activity)
  activity.on('ready', () => {
    logger.log('RKTimer App call ready')
  })

  activity.on('create', () => {
    logger.log('RKTimer App call creat')
    // activity.keyboard.preventDefaults(VOLUMEDOWN)
    // activity.keyboard.preventDefaults(VOLUMEUP)
    // activity.keyboard.preventDefaults(MICMUTE)
    activity.keyboard.preventDefaults(POWER)

    activity.keyboard.on('click', (event) => {
      logger.log('RKTimer click keyCode: ' + event.keyCode)
      rkDownTimer.interrupted()
      activity.setBackground()
    })
  })

  activity.on('destroy', () => {
    logger.log('RKTimer App call destroy')
    // activity.keyboard.restoreDefaults(VOLUMEDOWN)
    // activity.keyboard.restoreDefaults(VOLUMEUP)
    // activity.keyboard.restoreDefaults(MICMUTE)
    activity.keyboard.restoreDefaults(POWER)
  })

  activity.on('resume', () => {
    logger.log('RKTimer App call resume')
  })

  // where the onVoiceEvent is coming
  activity.on('pause', () => {
    logger.log('RKTimer App call pause')
    // rkDownTimer.interrupted(true)
  })

  activity.on('request', (nlp, action) => {
    logger.log('RKTimer App call request')
    switch (nlp.intent) {
      case 'timer_start':
        logger.log('RKTimer App is start.')
        rkDownTimer.setup(nlp)
        break
      case 'timer_restart':
        rkDownTimer.resetup(nlp)
        break
      case 'timer_pause':
        rkDownTimer.pause()
        break
      case 'timer_keepon':
        rkDownTimer.continue()
        break
      case 'timer_close':
        rkDownTimer.stop()
        break
      case 'howtouse_timer':
        rkDownTimer.usage()
        break
      default:
        rkDownTimer.destroy()
        activity.setBackground()
        break
    }
  })
}
