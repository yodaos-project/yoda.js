var fs = require('fs')
var logger = require('logger')('alarm')
var request = require('./request')

var CONFIGFILEPATH = '/data/AppData/alarm/config.json'
var OLDALARMFILE = '/data/rokid_alarms.json'
var OLDREMINDERFILE = '/data/rokid_reminders.json'

module.exports = function getAlarms (activity, callback) {
  readFiles()
    .then(values => {
      try {
        var _data = handleData(values)
        var alarms = _data.alarms || []
        var reminders = _data.reminders || []
        if (alarms.length === 0 && reminders.length === 0) {
          requestAlarms('sync_alarm')
          return
        } else {
          requestAlarms('upload_alarms', {
            alarms: alarms,
            reminders: reminders
          })
        }
        unlinkFiles()
      } catch (err) {
        throw err
      }
    })
    .catch(err => {
      if (err) { logger.log(err.stack) }
      requestAlarms('sync_alarm')
    })

  function handleData (values) {
    var alarms = []
    var reminders = []
    if (values[0] instanceof Error) {
      alarms = []
    } else {
      try {
        alarms = JSON.parse(values[0] || '{}').alarms || []
      } catch (err) {
        throw new Error('old alarm data parse error', err.stack)
      }
    }
    if (values[1] instanceof Error) {
      reminders = []
    } else {
      try {
        reminders = JSON.parse(values[1] || '{}').reminders || []
      } catch (err) {
        throw new Error('old reminder data parse error', err.stack)
      }
    }
    return {
      alarms: alarms,
      reminders: reminders
    }
  }
  function readFiles () {
    var alarmPromise = new Promise((resolve) => {
      fs.readFile(OLDALARMFILE, 'utf8', function (err, alarmData) {
        resolve(err || alarmData)
      })
    })
    var reminderPromise = new Promise((resolve) => {
      fs.readFile(OLDREMINDERFILE, 'utf8', function (err, reminderData) {
        resolve(err || reminderData)
      })
    })
    return Promise.all([
      alarmPromise,
      reminderPromise
    ])
  }

  function requestAlarms (intent, businessParams) {
    request({
      activity: activity,
      intent: intent,
      businessParams: businessParams || {},
      callback: (res) => {
        var resObj = {}
        try {
          resObj = JSON.parse(res)
        } catch (err) {
          logger.error('alarm data parse error', err.stack)
        }
        var alarmList = (resObj.data || {}).alarmList || []
        var command = {}
        for (var i = 0; i < alarmList.length; i++) {
          command[alarmList[i].id] = alarmList[i]
        }
        // clear config data
        fs.writeFile(CONFIGFILEPATH, '{}', (err) => {
          if (err) {
            logger.error('alarm data migration: write file error', err.stack)
          }
          callback && callback(command, true)
        })
      }
    })
    logger.log('alarm get config from cloud', intent)
  }

  function unlinkFiles () {
    fs.unlink(OLDALARMFILE, (err) => {
      if (err) {
        logger.error('alarm delete alarm file error', err.stack)
      }
    })
    fs.unlink(OLDREMINDERFILE, (err) => {
      if (err) {
        logger.error('alarm delete reminder file error', err.stack)
      }
    })
  }
}
