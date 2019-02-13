'use strict'

var wifi = require('@yoda/wifi')
var logger = require('logger')('alarm')
var getAlarms = require('./data-migration')
var Core = require('./alarm-core')

module.exports = function (activity) {
  logger.log('alarm load')
  var AlarmCore = new Core(activity)
  activity.once('notification', (channel) => {
    logger.log('alarm notification event')
    if (channel === 'on-ready') {
      AlarmCore.createConfigFile()
      var state = wifi.getNetworkState()
      if (state === wifi.NETSERVER_CONNECTED) {
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

  // media canceled
  activity.media.on('cancel', function () {
    logger.log('alarm media cancel')
    if (!AlarmCore.startTts) {
      AlarmCore.clearReminderTts()
    }
  })

  // todo: weakup event
  activity.on('destroy', function () {
    AlarmCore.clearAll()
    AlarmCore.clearReminderTts()
    logger.log(this.appId + ' destroyed')
  })
}
