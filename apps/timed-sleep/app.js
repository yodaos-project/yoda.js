'use strict'

var logger = require('logger')('timed-sleep')
var util = require('util')
var _ = require('@yoda/util')._
var time = require('@yoda/util').time
var math = require('@yoda/util').math
var trace = require('@yoda/trace')

module.exports = function (activity) {
  var config = require('./config.json')
  var strings = require('./strings.json')
  var timer = null
  var totalSecs = 0

  activity.on('create', () => {
    logger.log('on create')
    activity.keyboard.on('click', (event) => {
      logger.log('on key event: ' + event.keyCode)
      activity.tts.stop()
      activity.setBackground()
    })
    activity.keyboard.preventDefaults(config.KEY_CODE.POWER)
    activity.setContextOptions({ keepAlive: true })
  })

  activity.on('active', () => {
    logger.log('on active')
    activity.setContextOptions({ keepAlive: true })
  })

  activity.on('destroy', () => {
    logger.log('on destroy')
    activity.keyboard.restoreDefaults(config.KEY_CODE.POWER)
  })

  activity.on('request', (nlp, action) => {
    logger.log('on request: ', nlp.intent, nlp.slots)
    switch (nlp.intent) {
      case 'timed_sleep':
        totalSecs = parseTimeToSeconds(nlp.slots)
        logger.debug(`sleep after ${totalSecs} seconds`)
        if (totalSecs < config.TIME.SHORTEST) {
          speak(strings.SET_FAIL.TOO_SHORT)
        } else if (totalSecs > config.TIME.LONGEST) {
          speak(strings.SET_FAIL.TOO_LONG)
        } else {
          if (timer !== null) {
            clearTimeout(timer)
          }
          timer = setTimeout(doSleep, totalSecs * 1000)
          speak(strings.SET_SUCC, time.toString(totalSecs))
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
    var afterFunc = afterSpeak
    if (Array.isArray(text)) {
      var i = math.randInt(text.length)
      text = text[i]
    }
    if (typeof args === 'string') {
      text = util.format(text, args)
    } else if (typeof args === 'function') {
      afterFunc = args
    }
    sendCardToApp('ROKID.TIMED-SLEEP', {text: text})
    activity.tts.stop()
    return activity.setForeground().then(() => {
      return activity.tts.speak(text, { impatient: false }).catch((err) => {
        logger.error('Speak error: ', err)
        afterFunc()
      })
    }).then(afterFunc)
  }

  function parseTimeToSeconds (slots) {
    var dateTime = {}
    try {
      dateTime = JSON.parse(slots.dateTime.value)
    } catch (err) {
      logger.error('Parse time error: ', err)
    }
    var second = parseInt(_.get(dateTime, 'RelSecond', 0))
    var minute = parseInt(_.get(dateTime, 'RelMinute', 0))
    var hour = parseInt(_.get(dateTime, 'RelHour', 0))
    var day = parseInt(_.get(dateTime, 'RelDay', 0))
    var totalSecs = time.toSeconds(second, minute, hour, day)
    if (totalSecs !== 0) {
      return totalSecs
    }
    second = parseInt(_.get(dateTime, 'AbsSecond', 0))
    minute = parseInt(_.get(dateTime, 'AbsMinute', 0))
    hour = parseInt(_.get(dateTime, 'AbsHour', 0))
    var zone = _.get(dateTime, 'DayZone', 'MORNING')
    if (zone !== 'MORNING') {
      hour += 12
    }
    var date = new Date()
    date.setHours(hour)
    date.setMinutes(minute)
    date.setSeconds(second)
    logger.debug(`set: ${date.toString()}`)
    return Math.round((date.getTime() - Date.now()) / 1000)
  }

  function doSleep () {
    activity.idle().then(() => {
      sendCardToApp('ROKID.TIMED-SLEEP', {text: strings.GOOD_BYE})
      trace([{
        event: 'timed_sleep',
        action: 'idle'
      }])
      logger.log('sleep OK!')
    }).catch((err) => {
      logger.error('sleep failed:', err)
    }).finally(() => {
      activity.exit()
    })
  }

  function sendCardToApp (appId, content) {
    activity.wormhole.sendToApp('card', {
      appid: appId,
      template: JSON.stringify({ tts: content.text }),
      type: 'Chat'
    }).catch(err => logger.error('Unexpected error on send card to app', err.stack))
  }
}
