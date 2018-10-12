'use strict'

var AudioManager = require('@yoda/audio').AudioManager
var wifi = require('@yoda/wifi')
var logger = require('logger')('alarm')
var Cron = require('./node-cron')
var fs = require('fs')
var request = require('./request')
var yodaUtil = require('@yoda/util')

var configFilePath = '/data/AppData/alarm/config.json'
module.exports = function (activity) {
  var scheduleHandler = new Cron.Schedule()
  var jobQueue = []
  activity.on('create', function () {
    addConfigFile()
    var state = wifi.getNetworkState()
    if (state === wifi.NETSERVER_CONNECTED) {
      request({
        activity: activity,
        intent: 'sync_alarm',
        callback: (res) => {
          var resObj = JSON.parse(res)
          var alarmList = (resObj.data || {}).alarmList || []
          var command = {}
          for (var i = 0; i < alarmList.length; i++) {
            command[alarmList[i].id] = alarmList[i]
          }
          // clear config data
          fs.writeFile(configFilePath, '{}', (err) => {
            logger.log(err && err.stack)
            initAlarm(command, true)
          })
        }
      })
      logger.log('alarm should get config from cloud')
    } else {
      getTasksFromConfig(function (command) {
        initAlarm(command)
      })
    }
  })

  activity.on('url', url => {
    var command = JSON.parse(url.query.command || '[]')
    doTask(command)
  })

  activity.on('request', function (nlp, action) {
    var command = {}
    if (nlp.intent === 'RokidAppChannelForward') {
      command = JSON.parse(nlp.forwardContent.command)
      doTask(command)
    }
  })

  activity.on('destory', function () {
    logger.log(this.appId + ' destoryed')
  })

  function addConfigFile () {
    fs.stat(configFilePath, function (err, stat) {
      logger.log(err && err.stack)
      if (err) {
        yodaUtil.fs.mkdirp('/data/AppData/alarm', (err) => {
          if (err) {
            logger.error(err)
            return
          }
          fs.writeFile(configFilePath, '{}', function (err) {
            logger.log(err && err.stack)
          })
        })
      }
    })
  }
  function formatCommandData (commandObj) {
    return {
      id: commandObj.id,
      createTime: commandObj.createTime,
      type: commandObj.type,
      tts: commandObj.tts,
      url: commandObj.url,
      mode: commandObj.mode,
      time: commandObj.time,
      date: commandObj.date
    }
  }
  function initAlarm (command, isUpdateNative) {
    for (var i in command) {
      var commandOpt = formatCommandData(command[i])
      var pattern = transferPattern(command[i].date, command[i].time, command[i].repeatType)
      startTask(commandOpt, pattern)
      isUpdateNative && setConfig(command[i], 'add')
    }
    logger.log('alarm init')
  }
  function doTask (command) {
    if (command.length > 0) {
      for (var i = 0; i < command.length; i++) {
        var commandOpt = formatCommandData(command[i])
        if (command[i].flag === 'add' || command[i].flag === 'edit') {
          var pattern = transferPattern(command[i].date, command[i].time, command[i].repeatType)
          setConfig(command[i], 'add')
          startTask(commandOpt, pattern)
        }

        if (command[i].flag === 'delete') {
          scheduleHandler.clear(command[i].id)
          setConfig({
            id: command[i].id
          }, 'remove')
        }
      }
    }
  }

  function startTask (commandOpt, pattern) {
    logger.log(' alarm start')
    scheduleHandler.create(pattern, function () {
      taskCallback(commandOpt, commandOpt.mode)
    }, commandOpt)
  }
  function getTasksFromConfig (callback) {
    var parseJson = {}
    // data/AppData/alarm
    fs.readFile(configFilePath, 'utf8', function readFileCallback (err, data) {
      if (err) throw err
      parseJson = JSON.parse(data || '{}')
      callback(parseJson)
    })
  }

  function controlAudio (partial, piece, tick, duration) {
    var defaultAudio = AudioManager.getVolume(AudioManager.STREAM_ALARM)
    AudioManager.setVolume(AudioManager.STREAM_ALARM, Math.floor(defaultAudio * partial))
    var count = 0
    var timer = setInterval(function () {
      AudioManager.setVolume(AudioManager.STREAM_ALARM, Math.floor(defaultAudio * (partial + (count + 1) * piece)))
      if (count > duration) {
        AudioManager.setVolume(AudioManager.STREAM_ALARM, defaultAudio)
        clearInterval(timer)
      }
      count++
    }, tick)
  }

  function transferPattern (date, time, repeatType) {
    time = time.split(':')
    var s = time[2]
    var m = time[1]
    var h = time[0]
    switch (repeatType) {
      case 'D1':
      case 'D2':
      case 'D3':
      case 'D4':
      case 'D5':
      case 'D6':
      case 'D7':
        var weekNum = repeatType.split('D')[1]
        return s + ' ' + m + ' ' + h + ' * * ' + weekNum
      case 'WEEKEND':
        return s + ' ' + m + ' ' + h + ' * * 1-5'
      case 'WEEKDAY':
        return s + ' ' + m + ' ' + h + ' * * 6,0'
      default:
        break
    }
    var dateArr = date.split(':')
    var day = dateArr[2] === '**' ? '*' : dateArr[2]
    var month = dateArr[1] === '**' ? '*' : dateArr[1]
    return s + ' ' + m + ' ' + h + ' ' + day + ' ' + month + ' *'
  }
  function setConfig (options, mode) {
    fs.readFile(configFilePath, 'utf8', function readFileCallback (err, data) {
      if (err) throw err
      var parseJson = {}
      try {
        parseJson = JSON.parse(data || '{}')
      } catch (err) {
        logger.log(err && err.stack)
      }
      if (mode === 'add') {
        parseJson[options.id] = options
      }
      if (mode === 'remove') {
        delete parseJson[options.id]
      }
      fs.unlink(configFilePath, (err) => {
        if (err) {
          logger.log(err && err.stack)
          return
        }
        fs.writeFile(configFilePath, JSON.stringify(parseJson), function (err) {
          if (err) throw err
        })
      })
    })
  }

  function taskCallback (option, mode) {
    logger.log(option.id, ' start~!', jobQueue)
    if (jobQueue.indexOf(option.id) > -1) {
      return
    }

    jobQueue.push(option.id)
    var jobConf = scheduleHandler.getJobConfig(option.id)
    if (!jobConf) {
      logger.log('alarm' + option.id + ' cannot run')
      clearTask(mode, option)
      return
    }

    var tts = option.tts
    var state = wifi.getNetworkState()
    if (option.type === 'Remind') {
      var sameReminder = scheduleHandler.combineReminderTts()
      tts = sameReminder.combinedTTS
      activity.setForeground().then(() => {
        // send card to app
        request({
          activity: activity,
          intent: 'send_card',
          businessParams: {
            alarmId: option.id
          }
        })
      }).then(() => {
        if (state === wifi.NETSERVER_CONNECTED) {
          return activity.tts.speak(tts || option.tts)
        }
      }).then(() => {
        return activity.media.start('system://reminder_default.mp3', { streamType: 'alarm' })
      }).then(() => {
        scheduleHandler.clearReminderQueue()
        var reminderList = sameReminder.reminderList
        var reminderLen = reminderList.length
        for (var k = 0; k < reminderLen; k++) {
          clearTask(mode, reminderList[k])
        }
        activity.setBackground()
      })
    } else {
      controlAudio(0.5, 0.1, 1000, 5)
      activity.setForeground().then(() => {
        return activity.media.setLoopMode(true)
      }).then(() => {
        // send card to app
        request({
          activity: activity,
          intent: 'send_card',
          businessParams: {
            alarmId: option.id
          }
        })
      }).then(() => {
        if (state === wifi.NETSERVER_CONNECTED) {
          return activity.tts.speak(option.tts)
        }
      }).then(() => {
        if (state === wifi.NETSERVER_CONNECTED) {
          return activity.media.start(option.url, { streamType: 'alarm' })
        } else {
          return activity.media.start('system://alarm_default_ringtone.mp3', { streamType: 'alarm' })
        }
      }).then(() => {
        clearTask(mode, option)
        activity.setBackground()
      })
    }
  }

  function clearTask (mode, option) {
    var idx = jobQueue.indexOf(option.id)
    if (idx > -1) {
      jobQueue.splice(idx, 1)
    }
    if (mode === 'single') {
      scheduleHandler.clear(option.id)
      setConfig(option, 'remove')
    }
  }
}
