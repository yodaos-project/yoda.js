'use strict'

var wifi = require('@yoda/wifi')
var logger = require('logger')('alarm')
var getAlarms = require('./data-migration')
var Core = require('./alarm-core')

module.exports = function (activity) {
  var AlarmCore = new Core(activity)

  activity.on('create', function () {
    logger.log('alarm create')
    AlarmCore.createConfigFile()
    var state = wifi.getNetworkState()
    if (state === wifi.NETSERVER_CONNECTED) {
      getAlarms(activity, (command) => AlarmCore.init(command, true))
    } else {
      AlarmCore.getTasksFromConfig((command) => {
        AlarmCore.init(command)
      })
    }
    activity.keyboard.on('click', (e) => {
      AlarmCore.clearAll()
    })
  })

  activity.on('url', url => {
    var command = JSON.parse(url.query.command || '[]')
    AlarmCore.doTask(command)
    activity.setBackground()
  })

  activity.on('request', function (nlp, action) {
    var command = {}
    if (nlp.intent === 'RokidAppChannelForward') {
      command = JSON.parse(nlp.forwardContent.command)
      AlarmCore.doTask(command)
      activity.setBackground()
    }
  })

  // todo: weakup event
  activity.on('destroy', function () {
    AlarmCore.clearAll()
    logger.log(this.appId + ' destroyed')
  })
}
