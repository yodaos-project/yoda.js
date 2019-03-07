
'use strict'
var fs = require('fs')
var logger = require('logger')('alarm')
var yodaUtil = require('@yoda/util')
var wifi = require('@yoda/wifi')
var TtsEventHandle = require('@yodaos/ttskit').Convergence
var AudioManager = require('@yoda/audio').AudioManager
var request = require('./request')
var Cron = require('./node-cron')
var CONFIGFILEPATH = '/data/AppData/alarm/config.json'

var KEYCODES = [113, 114, 115, 116]
var DEFAULT_ALARM_RING = 'system://alarm_default_ringtone.mp3'
var DEFAULT_REMINDER_RING = 'system://reminder_default.mp3'

/**
 * Construct a new alarm core function
 *
 * Options:
 *   activity: avtivity object
 *
 * @constructor
 * @private
 * @param {Object} Options  avtivity object
 */
function AlarmCore (activity) {
  this.activity = activity
  this.scheduleHandler = new Cron.Schedule()
  this.jobQueue = []
  this.reminderTTS = []
  this.taskTimeout = null
  this.volumeInterval = null
  this.stopTimeout = null
  this.activeOption = null
  this.ttsClient = new TtsEventHandle(activity.tts)
}

/**
 * format command data
 * @private
 * @param {Object} Options command data item
 */
AlarmCore.prototype._formatCommandData = function (commandObj) {
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

/**
 * transfer cloud data to cron data
 * @private
 * @param {String} Options date string
 * @param {String} Options time string
 * @param {String} Options repeat type
 */
AlarmCore.prototype._transferPattern = function (date, time, repeatType) {
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

/**
 * prevent default event
 * @private
 */
AlarmCore.prototype._preventEventsDefaults = function () {
  for (var i = 0; i < KEYCODES.length; i++) {
    this.activity.keyboard.preventDefaults(KEYCODES[i])
  }
}

/**
 * update volume
 * @private
 * @param {Number} Options min volume
 * @param {Number} Options interval time
 * @param {Number} Options times to update volume
 */
AlarmCore.prototype._controlVolume = function (minVolume, tick, duration) {
  var defaultAudio = AudioManager.getVolume(AudioManager.STREAM_SYSTEM)
  if (defaultAudio <= minVolume || AudioManager.isMuted()) {
    AudioManager.setMute(false)
    AudioManager.setVolume(minVolume)
  } else {
    var range = Math.ceil((defaultAudio - minVolume) / duration)
    AudioManager.setVolume(AudioManager.STREAM_ALARM, minVolume)
    var count = 0
    this.volumeInterval = setInterval(function () {
      if (minVolume + (count + 1) * range >= defaultAudio) {
        AudioManager.setVolume(AudioManager.STREAM_ALARM, defaultAudio) // todo: change player volume
        clearInterval(this.volumeInterval)
      } else {
        AudioManager.setVolume(AudioManager.STREAM_ALARM, minVolume + (count + 1) * range)
      }
      count++
    }, tick)
  }
}

/**
 * update local file
 * @private
 * @param {Object} Options formated alarm data
 * @param {String} Options mode
 */
AlarmCore.prototype._setConfig = function (options) {
  fs.readFile(CONFIGFILEPATH, 'utf8', (err, data) => {
    if (err) {
      logger.error('alarm set config: get local data error', err.stack)
      return
    }
    var parseJson = {}
    try {
      parseJson = JSON.parse(data || '{}')
    } catch (err) {
      logger.error('alarm parse local data error ', err.stack)
    }
    for (var i = 0; i < options.length; i++) {
      if (options[i].mode === 'add') {
        parseJson[options[i].command.id] = options[i].command
      }
      if (options[i].mode === 'remove') {
        delete parseJson[options[i].command.id]
      }
    }
    fs.unlink(CONFIGFILEPATH, (err) => {
      if (err) {
        logger.error('alarm set config: clear local data error', err.stack)
        return
      }
      fs.writeFile(CONFIGFILEPATH, JSON.stringify(parseJson), (err) => {
        if (err) {
          logger.error('alarm set config: update local data error', err && err.stack)
        }
        // parseJson is empty, kill alarm
        if (Object.keys(parseJson).length === 0) {
          // kill alarm
          logger.log('kill alarm')
          this.activity.exit()
        }
      })
    })
  })
}

/**
 * clear task & update local file
 * @private
 * @param {String} Options mode
 * @param {Object} Options formated alarm data
 */
AlarmCore.prototype._clearTask = function (mode, option) {
  var idx = this.jobQueue.indexOf(option.id)
  if (idx > -1) {
    this.jobQueue.splice(idx, 1)
  }
  if (mode === 'single') {
    this.scheduleHandler.clear(option.id)
    this._setConfig([{ command: option, mode: 'remove' }])
  }
}

/**
 * tts speak
 * @private
 * @param {String} Options tts text
 */
AlarmCore.prototype._ttsSpeak = function (tts) {
  return new Promise((resolve, reject) => {
    this.ttsClient.speak(tts, (name) => {
      if (name === 'end') {
        resolve()
      } else if (name === 'error') {
        reject(new Error('tts speak error, alarm stop'))
      } else {
        logger.info('alarm tts event name', name)
      }
    })
  })
}

/**
 * tts speak
 * @private
 * @param {String} Options tts text
 */
AlarmCore.prototype.restoreEventsDefaults = function () {
  for (var i = 0; i < KEYCODES.length; i++) {
    this.activity.keyboard.restoreDefaults(KEYCODES[i])
  }
}

/**
 * task start play
 * @private
 * @param {Object} Options formated alarm data
 * @param {String} Options alarm type
 */
AlarmCore.prototype._taskCallback = function (option, isLocal) {
  var status = wifi.getWifiState() === wifi.WIFI_CONNECTED && !isLocal
  var tts = option.tts
  if (option.type === 'Remind') {
    tts = this.reminderTTS.join(',') + option.tts
    this.reminderTTS = []
    this.startTts = true
    this.activity.setForeground().then(() => {
      if (status) {
        return this._ttsSpeak(tts || option.tts)
      }
    }).then(() => {
      logger.info('alarm start second media')
      this.activity.media.start(DEFAULT_REMINDER_RING, {
        streamType: 'alarm'
      })
      return this.activity.media.setLoopMode(true)
    }).then(() => {
      this.stopTimeout = setTimeout(() => {
        logger.log('alarm-reminder: ', option.id, ' stop after 5 minutes')
        this.scheduleHandler.clearReminderQueue()
        this.clearAll()
      }, 5 * 60 * 1000)
    }).catch(() => {
      // alarm only need end event, but promise has to reject
    })
  } else {
    this.activity.setForeground().then(() => {
      this.startTts = true
      if (status) {
        return this._ttsSpeak(option.tts)
      }
    }).then(() => {
      logger.info('alarm start second media')
      var ringUrl = status ? option.url : DEFAULT_ALARM_RING
      this.activity.media.start(ringUrl, { streamType: 'alarm' })
      return this.activity.media.setLoopMode(true)
    }).then(() => {
      this.stopTimeout = setTimeout(() => {
        logger.log('alarm: ', option.id, ' stop after 5 minutes')
        this.clearAll()
      }, 5 * 60 * 1000)
    }).catch(() => {
      // alarm only need end event, but promise has to reject
    })
  }
}

/**
 * task actived
 * @private
 * @param {Object} Options formated command data
 * @param {String} Options mode
 */
AlarmCore.prototype._onTaskActive = function (option) {
  this.clearAll()
  this.activity.setForeground().then(() => {
    logger.log('alarm: ', option.id, ' start ')
    var mode = option.mode
    if (this.jobQueue.indexOf(option.id) > -1) {
      return
    }
    this.jobQueue.push(option.id)
    var jobConf = this.scheduleHandler.getJobConfig(option.id)
    if (!jobConf) {
      logger.log('alarm: ' + option.id + ' can not run')
      if (option.type === 'Remind') {
        this.reminderTTS.push(option.tts)
      }
      this._clearTask(mode, option)
      return
    }
    this.activeOption = option
    this._preventEventsDefaults()
    this._controlVolume(10, 1000, 7)
    // send card to app
    request({
      activity: this.activity,
      intent: 'send_card',
      businessParams: {
        alarmId: option.id
      }
    })
    this.startTts = false
    this.playFirstMedia()
  })
}

/**
 * alarm play first media
 * @param {Boolean} isLocal if play local ring
 */
AlarmCore.prototype.playFirstMedia = function (isLocal) {
  var state = wifi.getWifiState()
  var ringUrl = ''
  if (this.activeOption.type === 'Remind') {
    ringUrl = DEFAULT_REMINDER_RING
  } else {
    ringUrl = state === wifi.WIFI_CONNECTED && !isLocal ? this.activeOption.url : DEFAULT_ALARM_RING
  }
  this.activity.media.start(ringUrl, { streamType: 'alarm' }).then(() => {
    this.taskTimeout = setTimeout(() => {
      this.activity.media.stop()
      this._taskCallback(this.activeOption, isLocal)
    }, 7000)
  }).catch((err) => {
    logger.log('alarm first media play error', err.stack)
  })
}

/**
 * start task
 * @private
 * @param {Object} Options command item
 * @param {Object} Options pattern
 */
AlarmCore.prototype.startTask = function (commandOpt, pattern) {
  logger.log('alarm task start')
  this.scheduleHandler.create(pattern, () => {
    this._onTaskActive(commandOpt)
  }, commandOpt)
}

/**
 * initialize alarm data
 * @param {Object} Options alarm data array
 * @param {Boolean} Options if need to update lacal data
 */
AlarmCore.prototype.init = function (command, isUpdateNative) {
  logger.log('alarm init')
  var flag = false
  var options = []
  for (var i in command) {
    flag = true
    var commandOpt = this._formatCommandData(command[i])
    var pattern = this._transferPattern(command[i].date, command[i].time, command[i].repeatType)
    this.startTask(commandOpt, pattern)
    options.push({ command: command[i], mode: 'add' })
  }

  isUpdateNative && flag && this._setConfig(options)
  // clear local data
  if (!flag) {
    fs.writeFile(CONFIGFILEPATH, '{}', (err) => {
      if (err) {
        logger.error('alarm init: clear local data error', err.stack)
      }
      // kill alarm
      logger.log('kill alarm')
      this.activity.exit()
    })
  }
}

/**
 * create local config file
 */
AlarmCore.prototype.createConfigFile = function () {
  fs.stat(CONFIGFILEPATH, function (err) {
    if (err) {
      logger.log('alarm no local config file', err.stack)
      yodaUtil.fs.mkdirp('/data/AppData/alarm', (err) => {
        if (err) {
          logger.error('alarm create dir failed', err.stack)
          return
        }
        fs.writeFile(CONFIGFILEPATH, '{}', function (err) {
          if (err) {
            logger.error('alarm write file failed', err.stack)
          }
        })
      })
    }
  })
}

/**
 * get local data
 * @param {function} Options read file success callback
 */
AlarmCore.prototype.getTasksFromConfig = function (callback) {
  fs.readFile(CONFIGFILEPATH, 'utf8', function readFileCallback (err, data) {
    if (err) {
      logger.error('alarm no local data', err.stack)
      return
    }
    var parseJson = {}
    try {
      parseJson = JSON.parse(data || '{}')
    } catch (err) {
      logger.error('alarm parse data error:', err.stack)
    }
    callback(parseJson)
  })
}

/**
 * do task
 * @param {Object} Options command object
 */
AlarmCore.prototype.doTask = function (command) {
  if (command.length > 0) {
    var options = []
    for (var i = 0; i < command.length; i++) {
      var commandItem = command[i]
      var commandOpt = this._formatCommandData(commandItem)
      if (commandItem.flag === 'add' || commandItem.flag === 'edit') {
        var pattern = this._transferPattern(commandItem.date, commandItem.time, commandItem.repeatType)
        options.push({ command: commandItem, mode: 'add' })
        this.startTask(commandOpt, pattern)
      }

      if (commandItem.flag === 'del') {
        this.scheduleHandler.clear(commandItem.id)
        options.push({
          command: {
            id: commandItem.id
          },
          mode: 'remove'
        })
      }
    }
    this._setConfig(options)
  }
}

/**
 * click board clear all player
 * @param {Object} Options command object
 */
AlarmCore.prototype.clearAll = function () {
  if (this.activeOption) {
    this._clearTask(this.activeOption.mode, this.activeOption)
  }
  this.activeOption = null
  this.activity.media.stop()
  this.activity.tts.stop()
  this.taskTimeout && clearTimeout(this.taskTimeout)
  this.volumeInterval && clearInterval(this.volumeInterval)
  this.stopTimeout && clearTimeout(this.stopTimeout)
  this.restoreEventsDefaults()
  this.activity.setBackground()
}

AlarmCore.prototype.clearReminderTts = function () {
  this.reminderTTS = []
}

module.exports = AlarmCore
