
'use strict'
var fs = require('fs')
var logger = require('logger')('alarm-core')
var yodaUtil = require('@yoda/util')
var network = require('@yoda/network')
var AudioManager = require('@yoda/audio').AudioManager
var Cron = require('./node-cron')
var MediaManager = require('./media-manager').MediaManager
var keyboard = require('@yodaos/keyboard').keyboard
var CONFIGFILEPATH = '/data/AppData/alarm/config.json'

var KEYCODES = [113, 114, 115, 116]
var DEFAULT_ALARM_RING = '/opt/media/alarm_default_ringtone.mp3'
var DEFAULT_REMINDER_RING = '/opt/media/reminder_default.mp3'
var TYPE_REMINDER = 'reminder'
var TYPE_ALARM = 'alarm'

/**
 * Construct a new alarm core function
 *
 * Options:
 *   api: global api object
 *
 * @constructor
 * @private
 * @param {Object} Options  avtivity object
 */
function AlarmCore (api) {
  this.scheduleHandler = new Cron.Schedule()
  this.jobQueue = []
  this.taskTimeout = null
  this.volumeInterval = null
  this.stopTimeout = null
  this.activeOption = null
  this.ringUrl = null
  this.mediaManager = new MediaManager(this)
  this.wifi = new network.NetworkAgent()
}

/**
 * format command data
 * @private
 * @param {Object} Options command data item
 */
AlarmCore.prototype._formatCommandData = function (commandObj) {
  return {
    type: commandObj.type,
    id: commandObj.id,
    time: commandObj.time,
    repeat: commandObj.repeat,
    dayofweek_on: commandObj.dayofweek_on,
    dayofmonth_on: commandObj.dayofmonth_on,
    dayofyear_on: commandObj.dayofyear_on,
    feedback_utterance: commandObj.feedback_utterance,
    feedback_isblocking: commandObj.feedback_isblocking,
    feedback_pickup: commandObj.feedback_pickup,
    feedback_pickup_time: commandObj.feedback_pickup_time,
    memo_text: commandObj.memo_text
  }
}

/**
 * transfer cloud data to cron data
 * @private
 * @param {String} Options date string
 * @param {String} Options time string
 * @param {String} Options repeat type
 */
AlarmCore.prototype._transferPattern = function (dateTime, repeatType, option) {
  var date = dateTime.split(' ')
  var fullDate = date[0].split('-')
  var fullTime = date[1].split(':')
  var s = parseInt(fullTime[2] || 0)
  var m = parseInt(fullTime[1])
  var h = parseInt(fullTime[0])
  var day = parseInt(fullDate[2])
  var month = parseInt(fullDate[1])
  if (repeatType === 2) { // day repeat
    return s + ' ' + m + ' ' + h + ' * * *'
  } else if (repeatType === 3) { // week repeat
    return s + ' ' + m + ' ' + h + ' * * ' + option
  } else if (repeatType === 4) { // month repeat
    return s + ' ' + m + ' ' + h + ' ' + option + ' * *'
  } else if (repeatType === 5) { // year repeat
    return s + ' ' + m + ' ' + h + ' ' + option + ' *'
  }
  return s + ' ' + m + ' ' + h + ' ' + day + ' ' + month + ' *'
}

/**
 * prevent default event
 * @private
 */
AlarmCore.prototype._preventEventsDefaults = function () {
  logger.info('_preventEventsDefaults------------->')
  for (var i = 0; i < KEYCODES.length; i++) {
    keyboard.preventDefaults(KEYCODES[i])
  }
  keyboard.on('keydown', (e) => {
    logger.info('keydown------------->', e)
    this.clearAll()
  })
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

      if (options[i].mode === 'multiRemove') {
        var ids = options[i].command
        for (var id in ids) {
          logger.info('_setConfig----->mode is multiRemove && delete id ', ids[id])
          delete parseJson[ids[id]]
        }
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
          logger.log('_setConfig parseJson lenght is 0')
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
AlarmCore.prototype._clearTask = function (mode, option, isForce) {
  logger.info('_clearTask-----> mode: ', mode)
  var idx = this.jobQueue.indexOf(option.id)
  if (idx > -1) {
    this.jobQueue.splice(idx, 1)
  }
  logger.info('_clearTask-----> option: ', option)
  if (option.repeat === 1 || isForce) {
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
    this.mediaManager.speakTts(tts, (name) => {
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
    keyboard.restoreDefaults(KEYCODES[i])
  }
}

/**
 * task start play
 * @private
 * @param {Object} Options formated alarm data
 * @param {String} Options alarm type
 */
AlarmCore.prototype._taskCallback = function (option, isLocal) {
  this.wifi.getNetworkStatus().then((reply) => {
    var status = (reply.network.state === network.CONNECTED) && !isLocal
    var tts = option.memo_text
    if (option.type === TYPE_REMINDER) {
      tts = (option.memo_text || '提醒') + '时间到'
      this.startTts = true
      if (status) {
        return this._ttsSpeak(tts).then(() => {
          logger.info('alarm start second media')
          this.mediaManager.playAudio(this.ringUrl, { streamType: AudioManager.STREAM_ALARM, loop: true })
        }).then(() => {
          this.stopTimeout = setTimeout(() => {
            logger.log('alarm-reminder: ', option.id, ' stop after 1 minutes')
            this.scheduleHandler.clearReminderQueue()
            this.clearAll()
          }, 1 * 60 * 1000)
        }).catch(() => {
          // alarm only need end event, but promise has to reject
        })
      } else {
        this.mediaManager.playAudio(this.ringUrl, { streamType: AudioManager.STREAM_ALARM, loop: true })
        this.stopTimeout = setTimeout(() => {
          logger.log('alarm-reminder: ', option.id, ' stop after 1 minutes')
          this.scheduleHandler.clearReminderQueue()
          this.clearAll()
        }, 1 * 60 * 1000)
      }
    } else {
      this.startTts = true
      tts = (option.memo_text || '闹钟') + '时间到'
      if (status) {
        return this._ttsSpeak(tts).then(() => {
          logger.info('alarm start second media')
          this.mediaManager.playAudio(this.ringUrl, { streamType: AudioManager.STREAM_ALARM, loop: true })
        }).then(() => {
          this.stopTimeout = setTimeout(() => {
            logger.log('alarm: ', option.id, ' stop after 1 minutes')
            this.clearAll()
          }, 1 * 60 * 1000)
        }).catch(() => {
          // alarm only need end event, but promise has to reject
        })
      } else {
        this.ringUrl = DEFAULT_ALARM_RING
        this.mediaManager.playAudio(this.ringUrl, { streamType: AudioManager.STREAM_ALARM, loop: true })
        this.stopTimeout = setTimeout(() => {
          logger.log('alarm: ', option.id, ' stop after 1 minutes')
          this.clearAll()
        }, 1 * 60 * 1000)
      }
    }
  })
}

/**
 * task actived
 * @private
 * @param {Object} Options formated command data
 * @param {String} Options mode
 */
AlarmCore.prototype._onTaskActive = function (option) {
  this.clearAll()
  logger.log('alarm: ', option.id, ' start ')
  var mode = option.mode
  if (this.jobQueue.indexOf(option.id) > -1) {
    return
  }
  this.jobQueue.push(option.id)
  var jobConf = this.scheduleHandler.getJobConfig(option.id)
  if (!jobConf) {
    logger.log('alarm: ' + option.id + ' can not run')
    this._clearTask(mode, option)
    return
  }
  this.activeOption = option
  this._controlVolume(10, 1000, 7)
  this.startTts = false
  this.playFirstMedia()
  // this._preventEventsDefaults()
}

/**
 * alarm play first media
 * @param {Boolean} isLocal if play local ring
 */
AlarmCore.prototype.playFirstMedia = function (isLocal) {
  // var state = wifi.getWifiState()
  this.isLocal = isLocal
  if (this.activeOption.type === TYPE_REMINDER) {
    this.ringUrl = DEFAULT_REMINDER_RING
  } else {
    // this.ringUrl = state === wifi.WIFI_CONNECTED && !isLocal ? this.activeOption.url : DEFAULT_ALARM_RING
    this.ringUrl = DEFAULT_ALARM_RING
  }
  this.mediaManager.playAudio(this.ringUrl, { streamType: AudioManager.STREAM_ALARM }).then(() => {
    this.taskTimeout = setTimeout(() => {
      this.mediaManager.stopMedia()
      this._taskCallback(this.activeOption, this.isLocal)
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
    logger.log('alarm init -------> ', commandOpt.id, ' && commandOpt.repeat : ', commandOpt.repeat)
    if (commandOpt.repeat === 1) { // once alarm/reminder need check expired time
      var nowDate = new Date()
      var nowDateTime = nowDate.getTime()
      var alarmDate = this.formatAlarmDate(commandOpt.time)
      var alarmDateTime = alarmDate.getTime()
      logger.log('alarm init----->alarmDateStr: ', alarmDate, ' && ms value is : ', alarmDateTime, ' && origin date string is ', commandOpt.time)
      logger.log('alarm init----->nowDateTime: ', nowDate, ' && ms value is : ', nowDateTime)
      if (alarmDate <= nowDateTime) {
        logger.log('alarm init -------> ', commandOpt.id, '  time has expired, so should remove it from local')
        this.delAlarm(commandOpt)
        continue
      }
    }
    var alarmRepeatOption = this.getRepeatOption(commandOpt)
    var pattern = this._transferPattern(commandOpt.time, commandOpt.repeat, alarmRepeatOption)
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
    })
  }
}

AlarmCore.prototype.formatAlarmDate = function formatAlarmDate (alarmDate) {
  var date = alarmDate.split(' ')
  var fullDate = date[0].split('-')
  var fullTime = date[1].split(':')
  var s = parseInt(fullTime[2] || 0)
  var m = parseInt(fullTime[1])
  var h = parseInt(fullTime[0])
  var day = parseInt(fullDate[2])
  var month = parseInt(fullDate[1] - 1)
  var year = parseInt(fullDate[0])
  return new Date(year, month, day, h, m, s)
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

AlarmCore.prototype.isAlarmDataValid = function isAlarmDataValid (alarmData, noNeedCheckId) {
  if (!alarmData) {
    logger.warn('isAlarmDataValid -----> alarmData is undefine ')
    return false
  }
  if (alarmData.type !== TYPE_ALARM && alarmData.type !== TYPE_REMINDER) {
    logger.warn('isAlarmDataValid -----> alarmData.type is not alarm or reminder')
    return false
  }
  if (!noNeedCheckId && !alarmData.id) {
    logger.warn('isAlarmDataValid -----> alarmData id is undefined')
    return false
  }
  return true
}

AlarmCore.prototype.getRepeatOption = function getRepeatOption (alarmData) {
  var option = ''
  if (alarmData.repeat === 3) { // week repeat
    var dayOfWeekOn = alarmData.dayofweek_on
    var isRepeatD1 = dayOfWeekOn.substring(0, 1)
    var isRepeatD2 = dayOfWeekOn.substring(1, 2)
    var isRepeatD3 = dayOfWeekOn.substring(2, 3)
    var isRepeatD4 = dayOfWeekOn.substring(3, 4)
    var isRepeatD5 = dayOfWeekOn.substring(4, 5)
    var isRepeatD6 = dayOfWeekOn.substring(5, 6)
    var isRepeatD7 = dayOfWeekOn.substring(6, 7)
    logger.info('getRepeatOption---->dayofweek_on: ', dayOfWeekOn)
    if (isRepeatD1 === '1') {
      option = '1'
    }
    if (isRepeatD2 === '1') {
      option = (option === '' ? '2' : option + ',2')
    }
    if (isRepeatD3 === '1') {
      option = (option === '' ? '3' : option + ',3')
    }
    if (isRepeatD4 === '1') {
      option = (option === '' ? '4' : option + ',4')
    }
    if (isRepeatD5 === '1') {
      option = (option === '' ? '5' : option + ',5')
    }
    if (isRepeatD6 === '1') {
      option = (option === '' ? '6' : option + ',6')
    }
    if (isRepeatD7 === '1') {
      option = (option === '' ? '0' : option + ',0')
    }
  } else if (alarmData.repeat === 4) { // month repeat
    var dayOfMonthOn = alarmData.dayofmonth_on
    option = dayOfMonthOn
  } else if (alarmData.repeat === 5) { // year repeat
    var dayOfYearOn = alarmData.dayofyear_on
    var monthDay = dayOfYearOn.split('_')
    var month = monthDay[0]
    var day = monthDay[1]
    option = day + ' ' + month
  }
  return option
}

AlarmCore.prototype.addAlarm = function addAlarm (alarmData) {
  if (!this.isAlarmDataValid(alarmData)) {
    logger.warn('addAlarm ---but alarm data invalid: ', alarmData)
    return
  }
  var options = []
  var alarmRepeatOption = this.getRepeatOption(alarmData)
  logger.info('addAlarm--->alarmRepeatOption: ', alarmRepeatOption)
  var pattern = this._transferPattern(alarmData.time, alarmData.repeat, alarmRepeatOption)
  logger.info('addAlarm--->_transferPattern: ', pattern)
  options.push({ command: alarmData, mode: 'add' })
  this.startTask(alarmData, pattern)
  this._setConfig(options)
}

AlarmCore.prototype.cancelAll = function cancelAll (type) {
  logger.info('cancelAll: ------> is called,  type: ', type)
  var targetDelJobsId = []
  var allJobs = this.scheduleHandler.getAllJobs()
  for (var jobId in allJobs) {
    logger.info('cancelAll: ------> is called,  jobId: ', jobId)
    var jobType = this.scheduleHandler.getJobType(jobId)
    logger.info('cancelAll: ------> is called,  jobType: ', jobType)
    if (jobType === type) {
      targetDelJobsId.push(jobId)
    }
  }

  for (var j = 0; j < targetDelJobsId.length; j++) {
    logger.info('cancelAll: ------> _clearTask: ', targetDelJobsId[j])
    var idx = this.jobQueue.indexOf(targetDelJobsId[j])
    if (idx > -1) {
      this.jobQueue.splice(idx, 1)
    }
    this.scheduleHandler.clear(targetDelJobsId[j])
  }
  var options = []
  options.push({ command: targetDelJobsId, mode: 'multiRemove' })
  this._setConfig(options)
}

AlarmCore.prototype.delAlarm = function delAlarm (alarmData) {
  if (!this.isAlarmDataValid(alarmData, true)) {
    logger.warn('delAlarm ---but alarm data invalid: ', alarmData)
    return
  }
  if (!alarmData.id) {
    this.cancelAll(alarmData.type)
    return
  }
  this._clearTask(alarmData.type, alarmData, true)
}

AlarmCore.prototype.initAlarm = function initAlarm () {
  this.getTasksFromConfig((command) => {
    this.init(command)
  })
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
  this.mediaManager.stopMediaAndTts()
  this.taskTimeout && clearTimeout(this.taskTimeout)
  this.volumeInterval && clearInterval(this.volumeInterval)
  this.stopTimeout && clearTimeout(this.stopTimeout)
  // this.restoreEventsDefaults()
}

module.exports = AlarmCore
