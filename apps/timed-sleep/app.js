'use strict'

var logger = require('logger')('timed-sleep')
var util = require('util')
var _ = require('@yoda/util')._
var Time = require('./Time.js').Time
var trace = require('@yoda/trace')
var crypto = require('crypto')

module.exports = function (activity) {
  var config = require('./config.json')
  var strings = require('./strings.json')
  var timer = null
  var time = null

  activity.on('create', () => {
    logger.log('on create')
    activity.keyboard.on('click', (event) => {
      logger.log('on key event: ' + event.keyCode)
      activity.tts.stop()
      activity.setBackground()
    })
  })

  activity.on('active', () => {
    logger.log('on active')
    activity.keyboard.preventDefaults(config.KEY_CODE.POWER)
  })

  activity.on('background', () => {
    logger.log('on background')
    activity.keyboard.restoreDefaults(config.KEY_CODE.POWER)
  })

  activity.on('request', (nlp, action) => {
    logger.log('on request: ', nlp.intent, nlp.slots)
    switch (nlp.intent) {
      case 'timed_sleep':
        time = parseTime(nlp.slots)
        var secs = time.getSeconds()
        logger.debug(`sleep after ${secs} seconds`)
        if (secs < config.TIME_MIN) {
          speak(strings.SET_FAIL.TOO_SHORT)
        } else if (secs > config.TIME_MAX) {
          speak(strings.SET_FAIL.TOO_LONG)
        } else {
          if (timer !== null) {
            clearTimeout(timer)
          }
          timer = setTimeout(doSleep, secs * 1000)
          speak(strings.SET_SUCC, time.toString())
        }
        break
      case 'cancel_timing':
        if (timer === null) {
          speak(strings.CANCEL_FAIL)
        } else {
          clearTimeout(timer)
          timer = null
          speak(strings.CANCEL_SUCC)
        }
        break
      default:
        activity.exit()
        break
    }
  })

  function afterSpeak () {
    logger.debug('after speak, set background or exit.')
    if (timer !== null) {
      activity.setBackground()
    } else {
      activity.exit()
    }
  }

  function speak (text, args) {
    if (Array.isArray(text)) {
      var n = text.length
      var r = crypto.randomBytes(1).toString('hex')
      r = parseInt(r, 16)
      r = Math.floor(r * n / 256)
      text = text[r]
    }
    if (args !== null && args !== undefined) {
      text = util.format(text, args)
    }
    sendCardToApp({text: text})
    return activity.setForeground().then(() => {
      return activity.tts.speak(text, { impatient: false }).catch((err) => {
        logger.error('Speak error: ', err)
        afterSpeak()
      })
    }).then(afterSpeak)
  }

  function parseTime (slots) {
    var dateTime = {}
    try {
      dateTime = JSON.parse(slots.dateTime.value)
    } catch (err) {
      logger.error('Parse time error: ', err)
    }
    var second = _.get(dateTime, 'RelSecond', 0)
    var minute = _.get(dateTime, 'RelMinute', 0)
    var hour = _.get(dateTime, 'RelHour', 0)
    var day = _.get(dateTime, 'RelDay', 0)
    var tm = new Time(second, minute, hour, day)
    if (tm.getSeconds() !== 0) {
      return tm
    }
    second = _.get(dateTime, 'AbsSecond', 0)
    minute = _.get(dateTime, 'AbsMinute', 0)
    hour = _.get(dateTime, 'AbsMinute', 0)
    var zone = _.get(dateTime, 'DayZone', '')
    if (zone !== 'MORNING') {
      hour += 12
    }
    var now = new Date()
    logger.debug(`now: ${now.toString()}`)
    var date = new Date()
    date.setHours(hour)
    date.setMinutes(minute)
    date.setSeconds(second)
    logger.debug(`set: ${date.toString()}`)
    var dt = date.getTime() - now.getTime()
    tm.setSeconds(dt)
    return tm
  }

  function doSleep () {
    activity.idle().then(() => {
      sendCardToApp({text: strings.GOOD_BYE})
      trace([{
        event: 'timed_sleep',
        action: 'idle'
      }])
      logger.log('sleep OK!')
    }).catch((err) => {
      logger.error('sleep failed:', err)
    })
    activity.exit()
  }

  function sendCardToApp (content) {
    activity.wormhole.sendToApp('card', {
      appid: 'ROKID.SYSTEM',
      template: JSON.stringify({ tts: content.text }),
      type: 'Chat'
    }).catch(err => logger.error('Unexpected error on send card to app', err.stack))
  }
}
