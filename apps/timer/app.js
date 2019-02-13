'use strict'

var logger = require('logger')('timer-app')
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
  var remainMilliSecs = 0
  var lastStartTimestamp = 0
  var ringtoneTimer = null

  activity.on('create', () => {
    logger.log('on create')
    activity.keyboard.on('click', (event) => {
      logger.log('on key event: ' + event.keyCode)
      activity.tts.stop()
      stopRingtone()
      if (timer !== null) {
        activity.setBackground()
      } else {
        activity.exit({ clearContext: true })
      }
    })
    activity.keyboard.preventDefaults(config.KEY_CODE.POWER)
  })

  activity.on('background', () => {
    logger.log('on background')
    activity.keyboard.restoreDefaults(config.KEY_CODE.MIKE)
    activity.keyboard.restoreDefaults(config.KEY_CODE.VOLDOWN)
    activity.keyboard.restoreDefaults(config.KEY_CODE.VOLUP)
  })

  activity.on('destroy', () => {
    logger.log('on destroy')
    activity.keyboard.restoreDefaults(config.KEY_CODE.MIKE)
    activity.keyboard.restoreDefaults(config.KEY_CODE.VOLDOWN)
    activity.keyboard.restoreDefaults(config.KEY_CODE.VOLUP)
    activity.keyboard.restoreDefaults(config.KEY_CODE.POWER)
  })

  activity.on('request', (nlp, action) => {
    logger.log('on request: ', nlp.intent, nlp.slots)
    stopRingtone()
    switch (nlp.intent) {
      case 'timer_start':
        totalSecs = parseTimeToSeconds(nlp.slots)
        logger.debug(`count ${totalSecs} seconds`)
        if (totalSecs === 0) {
          speak(strings.SET_FAIL.NO_TIME)
        } else if (totalSecs < config.TIME.SHORTEST) {
          speak(strings.SET_FAIL.TOO_SHORT, time.toString(config.TIME.SHORTEST))
        } else if (totalSecs > config.TIME.LONGEST) {
          speak(strings.SET_FAIL.TOO_LONG, time.toString(config.TIME.LONGEST))
        } else {
          if (timer !== null) {
            clearTimeout(timer)
          }
          remainMilliSecs = totalSecs * 1000
          timer = setTimeout(timeupHandler, remainMilliSecs)
          lastStartTimestamp = Date.now()
          speak(strings.SET_SUCC, time.toString(totalSecs))
        }
        break
      case 'timer_close':
        if (timer === null) {
          speak(strings.CANCEL_FAIL)
        } else {
          clearTimeout(timer)
          timer = null
          speak(strings.CANCEL_SUCC)
        }
        break
      case 'timer_pause':
        if (timer !== null || remainMilliSecs > 0) {
          clearTimeout(timer)
          timer = null
          var elapsed = Date.now() - lastStartTimestamp
          remainMilliSecs -= elapsed
          speak(strings.PAUSE)
        } else {
          speak(strings.CANCEL_FAIL)
        }
        break
      case 'timer_keepon':
        logger.debug(`ramain time: ${Math.round(remainMilliSecs / 1000)} secs`)
        if (timer !== null) {
          var realRemain = remainMilliSecs - (Date.now() - lastStartTimestamp)
          speak(strings.RESUME, time.toString(Math.ceil(realRemain / 1000)))
        } else if (remainMilliSecs > 0) {
          timer = setTimeout(timeupHandler, remainMilliSecs)
          lastStartTimestamp = Date.now()
          speak(strings.RESUME, time.toString(Math.ceil(remainMilliSecs / 1000)))
        } else {
          speak(strings.CANCEL_FAIL)
        }
        break
      case 'timer_restart':
        if (timer === null) {
          speak(strings.CANCEL_FAIL)
        } else {
          clearTimeout(timer)
          remainMilliSecs = totalSecs * 1000
          timer = setTimeout(timeupHandler, remainMilliSecs)
          lastStartTimestamp = Date.now()
          speak(strings.RESTART, time.toString(totalSecs))
        }
        break
      case 'howtouse_timer':
        speak(strings.USAGE)
        break
      case 'timer_comeback':
        var deltaTime = remainMilliSecs - (Date.now() - lastStartTimestamp)
        speak(strings.CHECK, time.toString(Math.ceil(deltaTime / 1000)))
        break
      default:
        activity.exit({ clearContext: true })
        break
    }
  })

  function afterSpeak () {
    logger.debug('default after speak, set background.')
    activity.setBackground()
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
    sendCardToApp('ROKID.TIMER', {text: text})
    activity.tts.stop()
    return activity.setForeground().then(() => {
      return activity.tts.speak(text, { impatient: false }).catch((err) => {
        logger.error('Speak error: ', err)
        afterFunc()
      })
    }).then(afterFunc)
  }

  function parseTimeToSeconds (slots) {
    var second = 0
    var minute = 0
    var hour = 0
    var day = 0
    try {
      if (slots.timesecond) {
        second = parseInt(_.get(JSON.parse(slots.timesecond.value), 'number', 0))
      }
      if (slots.timeminute) {
        minute = parseInt(_.get(JSON.parse(slots.timeminute.value), 'number', 0))
      }
      if (slots.timehour) {
        hour = parseInt(_.get(JSON.parse(slots.timehour.value), 'number', 0))
      }
      if (slots.timeday) {
        day = parseInt(_.get(JSON.parse(slots.timeday.value), 'number', 0))
      }
    } catch (err) {
      logger.error('parse time error: ', err)
    }
    return time.toSeconds(second, minute, hour, day)
  }

  function timeupHandler () {
    logger.log('timer is up')
    timer = null
    remainMilliSecs = 0
    speak(strings.TIMEUP, () => playRingtone(config.RINGTONE.RING_TIMES))
    trace([{
      event: 'timer',
      action: 'triggered'
    }])
    activity.keyboard.preventDefaults(config.KEY_CODE.MIKE)
    activity.keyboard.preventDefaults(config.KEY_CODE.VOLDOWN)
    activity.keyboard.preventDefaults(config.KEY_CODE.VOLUP)
  }

  function sendCardToApp (appId, content) {
    activity.wormhole.sendToApp('card', {
      appid: appId,
      template: JSON.stringify({ tts: content.text }),
      type: 'Chat'
    }).catch(err => logger.error('Unexpected error on send card to app', err.stack))
  }

  function playRingtone (count) {
    logger.log(`playRingtone, count=${count}`)
    activity.setForeground().then(() => {
      activity.media.setLoopMode(true)
      activity.media.start(config.RINGTONE.URL, { streamType: 'alarm' })
      ringtoneTimer = setTimeout(() => {
        activity.media.stop()
        if (count - 1 > 0) {
          ringtoneTimer = setTimeout(() => {
            playRingtone(count - 1)
          }, config.RINGTONE.IDLE_SECONDS * 1000)
        } else {
          activity.exit({ clearContext: true })
        }
      }, config.RINGTONE.RING_SECONDS * 1000)
    })
  }

  function stopRingtone () {
    if (ringtoneTimer !== null) {
      clearTimeout(ringtoneTimer)
      ringtoneTimer = null
    }
    activity.media.stop()
  }
}
