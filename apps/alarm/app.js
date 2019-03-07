'use strict'

var wifi = require('@yoda/wifi')
var logger = require('logger')('alarm')
var getAlarms = require('./data-migration')
var Core = require('./alarm-core')

module.exports = function (activity) {
  logger.log('alarm load')
  var AlarmCore = new Core(activity)
  activity.once('notification', (channel) => {
    logger.log('alarm notification event: ', channel)
    if (channel === 'on-ready' || channel === 'on-system-booted') {
      AlarmCore.createConfigFile()
      var state = wifi.getWifiState()
      if (state === wifi.WIFI_CONNECTED) {
        getAlarms(activity, (command) => AlarmCore.init(command, true))
      } else {
        AlarmCore.getTasksFromConfig((command) => {
          AlarmCore.init(command)
        })
      }
    }
  })
  activity.on('create', function () {
    logger.log('alarm create')
    activity.keyboard.on('click', (e) => {
      AlarmCore.clearAll()
      AlarmCore.clearReminderTts()
    })
  })

  activity.on('url', url => {
    logger.log('alarm event: url', url)
    var command = JSON.parse(url.query.command || '[]')
    AlarmCore.doTask(command)
    activity.setBackground()
  })

  activity.on('request', function (nlp, action) {
    logger.log('alarm event: request', nlp)
    var command = {}
    if (nlp.intent === 'RokidAppChannelForward') {
      command = JSON.parse(nlp.forwardContent.command)
      AlarmCore.doTask(command)
      activity.setBackground()
    }
  })

  // first media canceled
  activity.media.on('cancel', function () {
    logger.log('alarm media cancel')
    if (!AlarmCore.startTts) {
      AlarmCore.clearReminderTts()
    }
  })

  // first media error
  activity.media.on('error', function () {
    logger.log('alarm media error')
    if (!AlarmCore.startTts) {
      AlarmCore.playFirstMedia(true)
    }
  })

  /**
   * media paused event
   * stop alarm when device was wakeuped
   * todo: add timing API or queue
   */
  activity.media.on('paused', function () {
    logger.log('alarm media paused')
    AlarmCore.clearAll()
    AlarmCore.clearReminderTts()
  })

  activity.on('destroy', function () {
    AlarmCore.clearAll()
    AlarmCore.clearReminderTts()
    logger.log(this.appId + ' destroyed')
  })

  /**
   * add unhandled rejection
   * reason: alarm will be crashed when some process strip priority from alarm
   * todo: just a temporary solution, will delete 'unhandledRejection' when support atomic process.
   */
  process.on('unhandledRejection', err => {
    logger.error('Alarm: Unhandled Rejection', err)
  })
}
