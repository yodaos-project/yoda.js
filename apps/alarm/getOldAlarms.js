var fs = require('fs')
var logger = require('logger')('alarm')
var request = require('./request')

var CONFIGFILEPATH = '/data/AppData/alarm/config.json'
var OLDALARMFILE = '/data/rokid_alarms.json'
var OLDREMINDERFILE = '/data/rokid_reminders.json'

function getOldAlarms (activity, callback) {
  fs.readFile(OLDALARMFILE, 'utf8', function readFileCallback (alarmErr, alarmData) {
    fs.readFile(OLDREMINDERFILE, 'utf8', function readFileCallback (reminderErr, reminderData) {
      if (alarmErr && reminderErr) {
        requestAlarms('sync_alarm')
        return
      }
      var alarmObj = JSON.parse(alarmData || '{}')
      var reminderObj = JSON.parse(reminderData || '{}')
      var alarms = alarmObj.alarms || []
      var reminders = reminderObj.reminders || []
      if (alarms.length === 0 && reminders.length === 0) {
        requestAlarms('sync_alarm')
      } else {
        requestAlarms(activity, 'upload_alarms', callback, {
          alarms: alarms,
          reminders: reminders
        })
      }
      unlinkFiles()
    })
  })
}

function requestAlarms (activity, intent, callback, businessParams) {
  request({
    activity: activity,
    intent: intent,
    businessParams: businessParams || {},
    callback: (res) => {
      var resObj = JSON.parse(res)
      var alarmList = (resObj.data || {}).alarmList || []
      var command = {}
      for (var i = 0; i < alarmList.length; i++) {
        command[alarmList[i].id] = alarmList[i]
      }
      // clear config data
      fs.writeFile(CONFIGFILEPATH, '{}', (err) => {
        logger.error(err && err.stack)
        callback && callback(command, true)
      })
    }
  })
  logger.log('alarm should get config from cloud', intent)
}

function unlinkFiles () {
  fs.unlink(OLDALARMFILE, (err) => {
    if (err) {
      logger.log(err && err.stack)
    }
  })
  fs.unlink(OLDREMINDERFILE, (err) => {
    if (err) {
      logger.log(err && err.stack)
    }
  })
}

module.exports = getOldAlarms
