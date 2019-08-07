'use strict'

var Application = require('@yodaos/application').Application
var AppTask = require('@yodaos/application').vui.AppTask
var config = require('./config.json')
var strings = require('./strings.json')
var os = global[Symbol.for('yoda#api')]
var localStorage = require('@yodaos/storage').localStorage
var logger = require('logger')('timer-app')
var util = require('util')
var time = require('@yoda/util').time
var math = require('@yoda/util').math
var alertTask = null

function speak (text, args) {
  if (Array.isArray(text)) {
    var i = math.randInt(text.length)
    text = text[i]
  }
  if (typeof args === 'string') {
    text = util.format(text, args)
  }
  app.openUrl(`yoda-app://system/speak?text=${text}`)
}

function isTimerExist () {
  var timer = localStorage.getItem('timer')
  var remainMilliSecs = localStorage.getItem('remainMilliSecs')
  logger.debug(`isTimerExist(timer = ${timer}, remainMilliSecs = ${remainMilliSecs})`)
  return timer !== null || remainMilliSecs > 0
}

function setTimer (millisecs) {
  logger.debug('setTimer: ', millisecs)
  var now = Date.now()
  localStorage.setItem('lastStartTimestamp', now)
  localStorage.setItem('remainMilliSecs', millisecs)
  localStorage.setItem('timer', 'chronos')
  os.chronos.schedule({
    triggerAt: (now + millisecs),
    url: 'yoda-app://timer/timeup'
  })
}

function resumeTimer () {
  var timer = localStorage.getItem('timer')
  var lastStartTimestamp = localStorage.getItem('lastStartTimestamp')
  var remainMilliSecs = localStorage.getItem('remainMilliSecs')
  var now = Date.now()
  if (timer !== null) {
    var realRemain = remainMilliSecs - (now - lastStartTimestamp)
    logger.debug(`resumeTimer(already exist, remain = ${realRemain})`)
    return realRemain
  } else if (remainMilliSecs > 0) {
    os.chronos.schedule({
      triggerAt: (now + remainMilliSecs),
      url: 'yoda-app://timer/timeup'
    })
    localStorage.setItem('lastStartTimestamp', now)
    localStorage.setItem('timer', 'chronos')
    logger.debug(`resumeTimer(continue, remain = ${remainMilliSecs})`)
    return remainMilliSecs
  } else {
    logger.debug('resumeTimer(not exist)')
    return 0
  }
}

function pauseTimer () {
  var timer = localStorage.getItem('timer')
  var remainMilliSecs = localStorage.getItem('remainMilliSecs')
  if (timer !== null) {
    localStorage.removeItem('timer')
    os.chronos.cancel('yoda-app://timer/timeup')
    var lastStartTimestamp = localStorage.getItem('lastStartTimestamp')
    var elapsed = Date.now() - lastStartTimestamp
    remainMilliSecs -= elapsed
    localStorage.setItem('remainMilliSecs', remainMilliSecs)
    logger.debug(`pauseTimer(remainMilliSecs = ${remainMilliSecs})`)
    return remainMilliSecs
  } else if (remainMilliSecs > 0) {
    logger.debug(`pauseTimer(already paused, remainMilliSecs = ${remainMilliSecs})`)
    return remainMilliSecs
  } else {
    logger.debug('pauseTimer(not exist)')
    return 0
  }
}

function cancelTimer () {
  logger.debug('cancelTimer')
  localStorage.removeItem('timer')
  localStorage.setItem('remainMilliSecs', 0)
  os.chronos.cancel('yoda-app://timer/timeup')
}

function setPickup () {
  os.setPickup(true)
}

function kbdHandler (action, event) {
  logger.log(`on kbd ${action}: ${event.keyCode}`)
  switch (action) {
    case 'click':
    case 'dbclick':
      if (alertTask !== null) {
        alertTask.interrupt()
        alertTask = null
      }
      break
    default:
      break
  }
}

var app = Application({
  created: () => {
    logger.debug('created')
    os.keyboard.on('click', (event) => { kbdHandler('click', event) })
    os.keyboard.on('dbclick', (event) => { kbdHandler('dbclick', event) })
  },
  destroyed: () => {
    logger.debug('destroyed')
    os.keyboard.restoreAll()
  },
  url: url => {
    logger.debug('on url: ', url)
    if (url.hostname !== 'timer') {
      return
    }
    var intent = url.pathname.substr(1)
    logger.debug(`intent = ${intent}`)
    switch (intent) {
      case 'timer_start':
        var tm = url.query
        var totalSecs = time.toSeconds(tm.second, tm.minute, tm.hour, tm.day)
        if (isNaN(totalSecs)) {
          totalSecs = 0
        }
        localStorage.setItem('totalSecs', totalSecs)
        logger.debug(`count ${totalSecs} seconds`)
        if (totalSecs === 0) {
          setPickup()
          speak(strings.SET_FAIL.NO_TIME)
        } else if (totalSecs < config.TIME.SHORTEST) {
          speak(strings.SET_FAIL.TOO_SHORT, time.toString(config.TIME.SHORTEST))
        } else if (totalSecs > config.TIME.LONGEST) {
          speak(strings.SET_FAIL.TOO_LONG, time.toString(config.TIME.LONGEST))
        } else {
          setTimer(totalSecs * 1000)
          if (url.query.tts != null) {
            speak(url.query.tts)
          } else {
            speak(strings.SET_SUCC, time.toString(totalSecs))
          }
        }
        break
      case 'timer_keepon':
        var realRemain = resumeTimer()
        if (realRemain > 0) {
          if (url.query.tts != null) {
            speak(url.query.tts)
          } else {
            speak(strings.RESUME, time.toString(Math.ceil(realRemain / 1000)))
          }
        } else {
          speak(strings.NO_TIMER_PROMPT)
        }
        break
      case 'timer_pause':
        realRemain = pauseTimer()
        if (realRemain > 0) {
          if (url.query.tts != null) {
            speak(url.query.tts)
          } else {
            speak(strings.PAUSE)
          }
        } else {
          speak(strings.NO_TIMER_PROMPT)
        }
        break
      case 'timer_close':
        if (isTimerExist()) {
          cancelTimer()
          if (url.query.tts != null) {
            speak(url.query.tts)
          } else {
            speak(strings.CANCEL_SUCC)
          }
        } else {
          speak(strings.NO_TIMER_PROMPT)
        }
        break
      case 'timer_restart':
        if (isTimerExist()) {
          totalSecs = localStorage.getItem('totalSecs')
          setTimer(totalSecs * 1000)
          if (url.query.tts != null) {
            speak(url.query.tts)
          } else {
            speak(strings.RESTART, time.toString(totalSecs))
          }
        } else {
          speak(strings.NO_TIMER_PROMPT)
        }
        break
      case 'timeup':
        logger.log('timer is up')
        localStorage.setItem('remainMilliSecs', 0)
        localStorage.removeItem('timer')
        if (alertTask !== null) {
          alertTask.interrupt()
        }
        alertTask = new AppTask([
          { 'tts': strings.TIMEUP },
          { 'media': config.RINGTONE.URL },
          { 'timeout': config.RINGTONE.IDLE_SECONDS * 1000 },
          { 'media': config.RINGTONE.URL }
        ], 'timer-timeup-task')
        alertTask.execute()
        os.keyboard.preventDefaults(config.KEY_CODE.MIKE)
        os.keyboard.preventDefaults(config.KEY_CODE.VOLDOWN)
        os.keyboard.preventDefaults(config.KEY_CODE.VOLUP)
        break
      case 'howtouse_timer':
        setPickup()
        speak(strings.USAGE)
        break
      case 'timer_comeback':
        if (isTimerExist()) {
          var lastStartTimestamp = localStorage.getItem('lastStartTimestamp')
          var deltaTime = localStorage.getItem('remainMilliSecs')
          var timer = localStorage.getItem('timer')
          if (timer !== null) {
            deltaTime -= (Date.now() - lastStartTimestamp)
          }
          speak(strings.CHECK, time.toString(Math.ceil(deltaTime / 1000)))
        } else {
          speak(strings.NO_TIMER_PROMPT)
        }
        break
      default:
        break
    }
  }
})

module.exports = app
