'use strict'
var AudioManager = require('@yoda/audio').AudioManager
var wifi = require('@yoda/wifi')
var logger = require('logger')('alarm')
var Cron = require('./node-cron')
var fs = require('fs')

module.exports = function (activity) {
  var scheduleHandler = new Cron.Schedule()
  activity.on('create', function () {
    var state = wifi.getNetworkState()
    if (state === wifi.NETSERVER_CONNECTED) {
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
    if (command.length > 0) {
      for (var i = 0; i < command.length; i++) {
        var commandOpt = {
          id: command[i].id,
          createTime: command[i].createTime,
          type: command[i].type,
          tts: command[i].tts,
          url: command[i].url,
          mode: command[i].mode
        }

        if (command[i].flag === 'add' || command[i].flag === 'edit') {
          var pattern = transferPattern(command[i].date, command[i].time)
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
  })

  activity.on('destory', function () {
    logger.log(this.appId + ' destoryed')
  })

  function startTask (commandOpt, pattern) {
    scheduleHandler.create(pattern, function () {
      taskCallback(commandOpt, commandOpt.mode)
    }, commandOpt)
  }
  function getTasksFromConfig (callback) {
    var parseJson = {}
    fs.readFile('./config.json', 'utf8', function readFileCallback (err, data) {
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

  function transferPattern (date, time) {
    var dateArr = date.split(':')
    time = time.split(':')
    var s = time[2]
    var m = time[1]
    var h = time[0]
    var day = dateArr[2] === '**' ? '*' : dateArr[2]
    var month = dateArr[1] === '**' ? '*' : dateArr[1]
    return s + ' ' + m + ' ' + h + ' ' + day + ' ' + month + ' *'
  }
  function setConfig (options, mode) {
    fs.readFile('./config.json', 'utf8', function readFileCallback (err, data) {
      if (err) throw err
      var parseJson = JSON.parse(data)
      if (mode === 'add') {
        parseJson[options.id] = options
      }
      if (mode === 'remove') {
        delete parseJson[options.id]
      }
      fs.writeFile('./config.json', JSON.stringify(parseJson), function (err) {
        if (err) throw err
      })
    })
  }

  function taskCallback (option, mode) {
    logger.log(option.id, ' start~!')
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
        if (state === wifi.NETSERVER_CONNECTED) {
          activity.tts.speak(tts || option.tts).then(() => {
            scheduleHandler.clearReminderQueue()
            clearTask(mode, option)
            activity.setBackground()
          })
        } else {
          activity.media.start('/opt/media/startup1.ogg', 'alarm').then(() => {
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
        if (state === wifi.NETSERVER_CONNECTED) {
          activity.media.start('/opt/media/alarm_default_ringtone.mp3', 'alarm').then(() => {
            clearTask(mode, option)
            activity.setBackground()
          })
        } else {
          activity.media.start('/opt/media/alarm_default_ringtone.mp3', 'alarm').then(() => {
            clearTask(mode, option)
            activity.setBackground()
          })
        }
      })
      // activity.setForeground().then(()=>{
      //   activity.media.setLoopMode(true).then(()=>{
      //     if (state === wifi.NETSERVER_CONNECTED) {
      //       activity.media.start('/opt/media/alarm_default_ringtone.mp3', 'alarm').then(()=>{
      //         clearTask(mode, option)
      //         activity.setBackground()
      //       })
      //     } else {
      //       activity.media.start('/opt/media/alarm_default_ringtone.mp3', 'alarm').then(()=>{
      //         clearTask(mode, option)
      //         activity.setBackground()
      //       })
      //     }
      //   })
      // })
    }
  }

  function clearTask (mode, option) {
    if (mode === 'single') {
      scheduleHandler.clear(option.id)
      setConfig(option, 'remove')
    }
  }
}
