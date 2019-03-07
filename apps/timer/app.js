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
  var isPickup = false
  var pickupTimer = null
  var isDestroied = true

  activity.on('create', () => {
    logger.log('on create')
    activity.keyboard.on('click', (event) => { kbdHandler('click', event) })
    activity.keyboard.on('dbclick', (event) => { kbdHandler('dbclick', event) })
    activity.keyboard.preventDefaults(config.KEY_CODE.POWER)
    activity.setContextOptions({ keepAlive: true })
    isDestroied = false
  })

  activity.on('active', () => {
    logger.log('on active')
    activity.setContextOptions({ keepAlive: true })
  })

  activity.on('background', () => {
    logger.log('on background')
    shutup()
    if (!isTimerExist()) {
      activity.exit({ clearContext: true })
    }
  })

  activity.on('destroy', () => {
    logger.log('on destroy')
    activity.keyboard.restoreAll()
    shutup()
    activity.setPickup(false)
    isDestroied = true
  })

  activity.on('request', (nlp, action) => {
    logger.log('on request: ', nlp.intent, nlp.slots)
    shutup()
    switch (nlp.intent) {
      case 'timer_start':
        totalSecs = parseTimeToSeconds(nlp.slots)
        logger.debug(`count ${totalSecs} seconds`)
        if (totalSecs === 0) {
          setPickup()
          speak(strings.SET_FAIL.NO_TIME)
        } else if (totalSecs < config.TIME.SHORTEST) {
          speak(strings.SET_FAIL.TOO_SHORT, time.toString(config.TIME.SHORTEST))
        } else if (totalSecs > config.TIME.LONGEST) {
          speak(strings.SET_FAIL.TOO_LONG, time.toString(config.TIME.LONGEST))
        } else {
          if (isTimerExist()) {
            cancelTimer()
          }
          setTimer(totalSecs * 1000)
          speak(strings.SET_SUCC, time.toString(totalSecs))
        }
        break
      case 'timer_close':
        if (isTimerExist()) {
          cancelTimer()
          speak(strings.CANCEL_SUCC)
        } else {
          speak(strings.CANCEL_FAIL)
        }
        break
      case 'timer_pause':
        if (isTimerExist()) {
          pauseTimer()
          speak(strings.PAUSE)
        } else {
          speak(strings.CANCEL_FAIL)
        }
        break
      case 'timer_keepon':
        var realRemain = resumeTimer()
        logger.debug(`real ramain time: ${realRemain} ms`)
        if (realRemain > 0) {
          speak(strings.RESUME, time.toString(Math.ceil(realRemain / 1000)))
        } else {
          speak(strings.CANCEL_FAIL)
        }
        break
      case 'timer_restart':
        if (isTimerExist()) {
          cancelTimer()
          setTimer(totalSecs * 1000)
          speak(strings.RESTART, time.toString(totalSecs))
        } else {
          speak(strings.CANCEL_FAIL)
        }
        break
      case 'howtouse_timer':
        setPickup()
        speak(strings.USAGE)
        break
      case 'timer_comeback':
        if (isTimerExist()) {
          var deltaTime = remainMilliSecs
          if (timer !== null) {
            deltaTime -= (Date.now() - lastStartTimestamp)
          }
          speak(strings.CHECK, time.toString(Math.ceil(deltaTime / 1000)))
        } else {
          speak(strings.CANCEL_FAIL)
        }
        break
      default:
        activity.exit({ clearContext: true })
        break
    }
  })

  function kbdHandler (action, event) {
    logger.log(`on kbd ${action}: ${event.keyCode}`)
    switch (action) {
      case 'click':
      case 'dbclick':
        shutup()
        if (isTimerExist()) {
          activity.setBackground()
        } else {
          activity.exit({ clearContext: true })
        }
        break
      default:
        break
    }
  }

  function pauseTimer () {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
      var elapsed = Date.now() - lastStartTimestamp
      remainMilliSecs -= elapsed
    }
  }

  function resumeTimer () {
    if (timer !== null) {
      var realRemain = remainMilliSecs - (Date.now() - lastStartTimestamp)
      return realRemain
    } else if (remainMilliSecs > 0) {
      timer = setTimeout(timeupHandler, remainMilliSecs)
      lastStartTimestamp = Date.now()
      return remainMilliSecs
    } else {
      return 0
    }
  }

  function cancelTimer () {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    remainMilliSecs = 0
  }

  function setTimer (ms) {
    remainMilliSecs = ms
    timer = setTimeout(timeupHandler, remainMilliSecs)
    lastStartTimestamp = Date.now()
  }

  function isTimerExist () {
    return timer !== null || remainMilliSecs > 0
  }

  function defaultNextAction () {
    if (isDestroied) {
      logger.warn('Destroied early...')
      return activity.exit({ clearContext: true })
    }
    if (isPickup) {
      logger.info('In pickup mode, listening...')
      return
    }
    if (isTimerExist()) {
      logger.debug('Timer running, set background.')
      activity.setBackground()
    } else {
      logger.log('Timer cancelled, exit now.')
      activity.exit({ clearContext: true })
    }
  }

  var nextActionFunc = null
  var nextActionId = 0
  function registerNextAction (fn) {
    if (typeof fn === 'function' && fn !== defaultNextAction) {
      nextActionFunc = fn
      logger.debug('register private fn')
    } else {
      nextActionFunc = defaultNextAction
      logger.debug('register default fn')
    }
    nextActionId = Date.now()
    return nextActionId
  }

  function triggerNextAction (id, fn) {
    logger.debug(`queueId=${nextActionId}, triggerId=${id}`)
    if (nextActionId !== id) {
      logger.info('action updated.')
      return
    }
    if (typeof fn === 'function') {
      nextActionFunc = fn
    }
    process.nextTick(nextActionFunc)
  }

  function setPickup () {
    if (!isPickup) {
      var id = registerNextAction()
      activity.setPickup(true, 999999)
        .then(() => {
          logger.debug('setPickup OK.')
          isPickup = true
          if (pickupTimer != null) {
            clearTimeout(pickupTimer)
          }
          pickupTimer = setTimeout(() => {
            isPickup = false
            triggerNextAction(id)
          }, config.TIME.PICKUP)
        })
        .catch((err) => {
          logger.error('setPickup failed:', err)
          triggerNextAction(id)
        })
    }
  }

  function afterSpeakCallback (id) {
    logger.debug('Before trigger next action.')
    triggerNextAction(id)
  }

  function speak (text, args) {
    var regFunc = defaultNextAction
    if (Array.isArray(text)) {
      var i = math.randInt(text.length)
      text = text[i]
    }
    if (typeof args === 'string') {
      text = util.format(text, args)
    } else if (typeof args === 'function') {
      regFunc = args
    }
    var id = registerNextAction(regFunc)
    sendCardToApp('ROKID.TIMER', {text: text})
    activity.tts.stop().catch((err) => { logger.warn('stop tts err:', err) })
    return activity.setForeground().then(() => {
      return activity.tts.speak(text, { impatient: false }).catch((err) => {
        logger.error('Speak error: ', err)
        afterSpeakCallback(id)
      })
    }).then(() => { afterSpeakCallback(id) })
  }

  function shutup () {
    activity.tts.stop().catch((err) => {
      logger.warn('stop tts err:', err)
    })
    stopRingtone()
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
    speak(strings.TIMEUP, () => {
      logger.debug('before trigger play ringtone')
      playRingtone(config.RINGTONE.RING_TIMES)
    })
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
      activity.media.start(config.RINGTONE.URL, { streamType: 'alarm' }).catch((err) => {
        logger.warn('play ringtone error:', err)
      })
      ringtoneTimer = setTimeout(() => {
        activity.media.stop().catch((err) => { logger.warn('stop ringtone error:', err) })
        if (count - 1 > 0) {
          ringtoneTimer = setTimeout(() => {
            playRingtone(count - 1)
          }, config.RINGTONE.IDLE_SECONDS * 1000)
        } else {
          activity.exit({ clearContext: true })
        }
      }, config.RINGTONE.RING_SECONDS * 1000)
    }).catch((err) => {
      logger.warn('play ringtone failed:', err)
    })
  }

  function stopRingtone () {
    if (ringtoneTimer !== null) {
      clearTimeout(ringtoneTimer)
      ringtoneTimer = null
    }
    activity.media.stop().catch((err) => {
      logger.warn('stop ringtone error:', err)
    })
  }
}
