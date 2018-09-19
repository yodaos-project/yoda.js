'use strict'
var AudioManager = require('@yoda/audio').AudioManager
var wifi = require('@yoda/wifi')
var logger = require('logger')('alarm')
var Cron = require('./node-cron')
var fs = require('fs')
var request = require('./request')

module.exports = function (activity) {
  var scheduleHandler = new Cron.Schedule()
  var jobQueue = []
  activity.on('create', function () {
    var state = wifi.getNetworkState()
    if (state === wifi.NETSERVER_CONNECTED) {
      request({
        activity: activity,
        intent: 'sync_alarm',
        callback: (res) => {
          logger.log('res.data', JSON.parse(res))
          var resObj = JSON.parse(res)
          var alarmList = (resObj.data || {}).alarmList || []
          var command = {}
          for (var i = 0; i < alarmList.length; i++) {
            command[alarmList[i].id] = alarmList[i]
          }
          initAlarm(command)
        }
      })
      logger.log('alarm should get config from cloud')
    } else {
      getTasksFromConfig(function (command) {
        for (var i in command) {
          var commandOpt = {
            id: command[i].id,
            createTime: command[i].createTime,
            type: command[i].type,
            tts: command[i].tts,
            url: command[i].url,
            mode: command[i].mode
          }
          var pattern = transferPattern(command[i].date, command[i].time)
          startTask(commandOpt, pattern)
        }
        logger.log('alarm init')
      })
    }
  })

  activity.on('url', url => {
    logger.log('url!!!', url.query)
    var command = JSON.parse(decodeURI(url.query.slice(8)))
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

  function initAlarm (command) {
    for (var i in command) {
      var commandOpt = {
        id: command[i].id,
        createTime: command[i].createTime,
        type: command[i].type,
        tts: command[i].tts,
        url: command[i].url,
        mode: command[i].mode,
        time: command[i].time,
        date: command[i].date
      }
      var pattern = transferPattern(command[i].date, command[i].time, command[i].repeatType)
      startTask(commandOpt, pattern)
    }
    logger.log('alarm init')
  }
  function doTask (command) {
    if (command.length > 0) {
      for (var i = 0; i < command.length; i++) {
        var commandOpt = {
          id: command[i].id,
          createTime: command[i].createTime,
          type: command[i].type,
          tts: command[i].tts,
          url: command[i].url,
          mode: command[i].mode,
          time: command[i].time,
          date: command[i].date
        }

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
    fs.readFile('/data/AppData/alarm/config.json', 'utf8', function readFileCallback (err, data) {
      if (err) throw err
      parseJson = JSON.parse(data)
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
    if (['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].indexOf(repeatType) >= 0) {
      var weekNum = repeatType.split('D')[1]
      return s + ' ' + m + ' ' + h + ' * * ' + weekNum
    }
    if (repeatType === 'WEEKEND') {
      return s + ' ' + m + ' ' + h + ' * * 1-5'
    }
    if (repeatType === 'WEEKDAY') {
      return s + ' ' + m + ' ' + h + ' * * 6,0'
    }
    var dateArr = date.split(':')
    var day = dateArr[2] === '**' ? '*' : dateArr[2]
    var month = dateArr[1] === '**' ? '*' : dateArr[1]
    return s + ' ' + m + ' ' + h + ' ' + day + ' ' + month + ' *'
  }
  function setConfig (options, mode) {
    fs.readFile('/data/AppData/alarm/config.json', 'utf8', function readFileCallback (err, data) {
      if (err) throw err
      var parseJson = JSON.parse(data)
      if (mode === 'add') {
        parseJson[options.id] = options
      }
      if (mode === 'remove') {
        delete parseJson[options.id]
      }
      fs.writeFile('/data/AppData/alarm/config.json', JSON.stringify(parseJson), function (err) {
        if (err) throw err
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
      tts = scheduleHandler.combineReminderTts()
      activity.setForeground().then(() => {
        // send card to app
        request({
          activity: activity,
          intent: 'send_card',
          businessParams: {
            alarmId: option.id
          }
        })
        if (state === wifi.NETSERVER_CONNECTED) {
          activity.tts.speak(tts || option.tts).then(() => {
            activity.media.start('system://reminder_default.mp3', { streamType: 'alarm' }).then(() => {
              scheduleHandler.clearReminderQueue()
              clearTask(mode, option)
              activity.setBackground()
            })
          })
        } else {
          activity.media.start('system://reminder_default.mp3', { streamType: 'alarm' }).then(() => {
            clearTask(mode, option)
            activity.setBackground()
          })
        }
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
        if (state === wifi.NETSERVER_CONNECTED) {
          activity.tts.speak(option.tts).then(() => {
            activity.media.start(option.url, { streamType: 'alarm' }).then(() => {
              clearTask(mode, option)
              activity.setBackground()
            })
          })
        } else {
          activity.media.start('system://alarm_default_ringtone.mp3', { streamType: 'alarm' }).then(() => {
            clearTask(mode, option)
            activity.setBackground()
          })
        }
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
