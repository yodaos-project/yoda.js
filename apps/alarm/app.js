'use strict'

var AudioManager = require('@yoda/audio').AudioManager
var wifi = require('@yoda/wifi')
var logger = require('logger')('alarm')
var Cron = require('./node-cron')
var fs = require('fs')
var request = require('./request')
var yodaUtil = require('@yoda/util')
var getAlarms = require('./data-migration')

var CONFIGFILEPATH = '/data/AppData/alarm/config.json'
var KEYCODES = [113, 114, 115, 116]

module.exports = function (activity) {
  var scheduleHandler = new Cron.Schedule()
  var jobQueue = []
  var taskTimeout = null
  var volumeInterval = null
  activity.on('create', function () {
    logger.log('alarm create')
    addConfigFile()
    var state = wifi.getNetworkState()
    if (state === wifi.NETSERVER_CONNECTED) {
      getAlarms(activity, initAlarm)
    } else {
      getTasksFromConfig(function (command) {
        initAlarm(command)
      })
    }
    activity.keyboard.on('click', (e) => {
      activity.media.stop()
      activity.tts.stop()
      taskTimeout && clearTimeout(taskTimeout)
      volumeInterval && clearInterval(volumeInterval)
      restoreEventsDefaults()
      activity.setBackground()
    })
  })

  activity.on('url', url => {
    var command = JSON.parse(url.query.command || '[]')
    doTask(command)
    activity.setBackground()
  })

  activity.on('request', function (nlp, action) {
    var command = {}
    if (nlp.intent === 'RokidAppChannelForward') {
      command = JSON.parse(nlp.forwardContent.command)
      doTask(command)
      activity.setBackground()
    }
  })

  // todo: weakup event
  activity.on('destroy', function () {
    restoreEventsDefaults()
    logger.log(this.appId + ' destroyed')
  })

  function preventEventsDefaults () {
    for (var i = 0; i < KEYCODES.length; i++) {
      activity.keyboard.preventDefaults(KEYCODES[i])
    }
  }
  function restoreEventsDefaults () {
    for (var i = 0; i < KEYCODES.length; i++) {
      activity.keyboard.restoreDefaults(KEYCODES[i])
    }
  }

  function addConfigFile () {
    fs.stat(CONFIGFILEPATH, function (err, stat) {
      logger.error(err && err.stack)
      if (err) {
        yodaUtil.fs.mkdirp('/data/AppData/alarm', (err) => {
          if (err) {
            logger.error(err && err.stack)
            return
          }
          fs.writeFile(CONFIGFILEPATH, '{}', function (err) {
            logger.error(err && err.stack)
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
    var flag = false
    for (var i in command) {
      flag = true
      var commandOpt = formatCommandData(command[i])
      var pattern = transferPattern(command[i].date, command[i].time, command[i].repeatType)
      startTask(commandOpt, pattern)
      isUpdateNative && setConfig(command[i], 'add')
    }
    // clear local data
    if (!flag) {
      fs.writeFile(CONFIGFILEPATH, '{}', function (err) {
        if (err) {
          logger.error(err && err.stack)
        }
      })
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

        if (command[i].flag === 'del') {
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
      onTaskActive(commandOpt, commandOpt.mode)
    }, commandOpt)
  }
  function getTasksFromConfig (callback) {
    fs.readFile(CONFIGFILEPATH, 'utf8', function readFileCallback (err, data) {
      if (err) {
        logger.error(err && err.stack)
        return
      }
      var parseJson = {}
      try {
        parseJson = JSON.parse(data || '{}')
      } catch (err) {
        logger.error(err && err.stack)
      }
      callback(parseJson)
    })
  }

  function controlAudio (minVolume, tick, duration) {
    var defaultAudio = AudioManager.getVolume(AudioManager.STREAM_SYSTEM)
    if (defaultAudio <= minVolume || AudioManager.isMuted()) {
      AudioManager.setMute(false)
      AudioManager.setVolume(minVolume)
    } else {
      var range = Math.ceil((defaultAudio - minVolume) / duration)
      AudioManager.setVolume(AudioManager.STREAM_ALARM, minVolume)
      var count = 0
      volumeInterval = setInterval(function () {
        if (minVolume + (count + 1) * range >= defaultAudio) {
          AudioManager.setVolume(AudioManager.STREAM_ALARM, defaultAudio) // todo: change player volume
          clearInterval(volumeInterval)
        } else {
          AudioManager.setVolume(AudioManager.STREAM_ALARM, minVolume + (count + 1) * range)
        }
        count++
      }, tick)
    }
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
    fs.readFile(CONFIGFILEPATH, 'utf8', function readFileCallback (err, data) {
      if (err) {
        logger.error(err && err.stack)
        return
      }
      var parseJson = {}
      try {
        parseJson = JSON.parse(data || '{}')
      } catch (err) {
        logger.error(err && err.stack)
      }
      if (mode === 'add') {
        parseJson[options.id] = options
      }
      if (mode === 'remove') {
        delete parseJson[options.id]
      }
      fs.unlink(CONFIGFILEPATH, (err) => {
        if (err) {
          logger.error(err && err.stack)
          return
        }
        fs.writeFile(CONFIGFILEPATH, JSON.stringify(parseJson), function (err) {
          if (err) {
            logger.error(err && err.stack)
          }
        })
      })
    })
  }

  function onTaskActive (option, mode) {
    activity.setForeground().then(() => {
      preventEventsDefaults()
      controlAudio(10, 1000, 7)
      var state = wifi.getNetworkState()
      var ringUrl = ''
      if (option.type === 'Remind') {
        ringUrl = 'system://reminder_default.mp3'
      } else {
        ringUrl = state === wifi.NETSERVER_CONNECTED ? option.url : 'system://alarm_default_ringtone.mp3'
      }
      // send card to app
      request({
        activity: activity,
        intent: 'send_card',
        businessParams: {
          alarmId: option.id
        }
      })
      activity.media.start(ringUrl, { streamType: 'alarm' }).then(() => {
        taskTimeout = setTimeout(() => {
          activity.media.stop()
          taskCallback(option, mode)
        }, 7000)
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
        if (state === wifi.NETSERVER_CONNECTED) {
          return activity.tts.speak(tts || option.tts)
        }
      }).then(() => {
        return activity.media.start('system://reminder_default.mp3', {
          streamType: 'alarm',
          impatient: false
        })
      }).then(() => {
        restoreEventsDefaults()
        scheduleHandler.clearReminderQueue()
        var reminderList = sameReminder.reminderList
        var reminderLen = reminderList.length
        for (var k = 0; k < reminderLen; k++) {
          clearTask(mode, reminderList[k])
        }
        activity.setBackground()
      })
    } else {
      activity.setForeground().then(() => {
        logger.log('media play')
      }).then(() => {
        if (state === wifi.NETSERVER_CONNECTED) {
          return activity.tts.speak(option.tts)
        }
      }).then(() => {
        if (state === wifi.NETSERVER_CONNECTED) {
          activity.media.start(option.url, { streamType: 'alarm' })
          return activity.media.setLoopMode(true)
        } else {
          activity.media.start('system://alarm_default_ringtone.mp3', { streamType: 'alarm' })
          return activity.media.setLoopMode(true)
        }
      }).then(() => {
        clearTask(mode, option)
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
