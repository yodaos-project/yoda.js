var _ = require('@yoda/util')._
var logger = require('logger')('custom-config')
var Url = require('url')
var property = require('@yoda/property')

module.exports = function customConfig (activity) {
  var CONFIG_FAILED = '设置失败'
  var LIGHT_SWITCH_OPEN = '灯光已开启'
  var LIGHT_SWITCH_CLOSE = '灯光已关闭'
  var WAKE_SOUND_OPEN = '已为你开启'
  var WAKE_SOUND_CLOSE = '已关闭'
  var PICKUP_SWITCH_OPEN = '好的,已打开连续对话'
  var PICKUP_SWITCH_CLOSE = '收到,已关闭'
  // var KEY_WAKE_SOUND_SWITCH = 'wakeupSoundEffects'
  // var KEY_THEME_LIGHT_SWITCH = 'standbyLight'
  // var KEY_KEEP_CONFIRM_SWITCH = 'continuousDialog'
  // var KEY_NIGHT_MODE_SWITCH = 'nightMode'
  // var KEY_VT_WORDS = 'vt_words'
  var INTENT_WAKE_SOUND_SWITCH = 'awakeswitch'
  var INTENT_THEME_LIGHT_SWITCH = 'lightswitch'
  var INTENT_KEEP_CONFIRM_SWITCH = 'pickupswitch'
  var SWITCH_OPEN = 'open'
  var SWITCH_CLOSE = 'close'
  this.startTime = null
  this.endTime = null
  this.inNightMode = false
  this.nextDeltaTime = null
  this.deltaTime = null
  this.waitForCloseTimer = null
  this.waitForNextTimer = null

  activity.on('request', (nlp, action) => {
    var intent = nlp.intent
    var actionValue = _.get(nlp, 'slots.open.type') || _.get(nlp, 'slots.close.type')
    logger.info('request---->intent:' + intent + ';   action: ' + actionValue)
    if (intent === INTENT_KEEP_CONFIRM_SWITCH) {
      onPickupSwitchStatusChanged(actionValue, false)
    } else if (intent === INTENT_THEME_LIGHT_SWITCH) {
      onLightSwitchStatusChanged(actionValue, false)
    } else if (intent === INTENT_WAKE_SOUND_SWITCH) {
      onWakeupSwitchStatusChanged(actionValue, false)
    }
  })

  activity.on('url', (url) => {
    logger.info('on Url---->is called: ')
    var urlObj = Url.parse(url)
    var queryObj = getParams(urlObj.query)
    // var queryObj = urlObj.query
    if (typeof queryObj === 'object') {
      logger.info('on Url----> query is object')
    } else if (typeof queryObj === 'string') {
      logger.info('on Url----> query is string:  ' + queryObj)
    }
    var action = queryObj.action
    var isFirstLoad = queryObj.isFirstLoad
    logger.info('on Url----> action: ' + action + '; urlObj.pathname: ' + urlObj.pathname + ';   isFirstLoad: ' + isFirstLoad)
    if (urlObj.pathname === '/nightMode') {
      this.startTime = queryObj.startTime
      this.endTime = queryObj.endTime
      nightMode(action)
    } else if (urlObj.pathname === '/vt_words') {
      // need deal vtwords: add/update/delete...
    } else if (urlObj.pathname === '/continuousDialog') {
      onPickupSwitchStatusChanged(action, isFirstLoad)
    } else if (urlObj.pathname === '/wakeupSoundEffects') {
      onWakeupSwitchStatusChanged(action, isFirstLoad)
    } else if (urlObj.pathname === '/standbyLight') {
      onLightSwitchStatusChanged(action, isFirstLoad)
    }
  })

  function onPickupSwitchStatusChanged (action, isFirstLoad) {
    if (action) {
      property.set('sys.pickupswitch', action, 'persist')
      if (!isFirstLoad) {
        if (action === SWITCH_OPEN) {
          activity.tts.speak(PICKUP_SWITCH_OPEN).then(() => activity.exit())
        } else if (action === SWITCH_CLOSE) {
          activity.tts.speak(PICKUP_SWITCH_CLOSE).then(() => activity.exit())
        } else {
          activity.tts.speak(CONFIG_FAILED).then(() => activity.exit())
        }
      }
    }
  }

  function onLightSwitchStatusChanged (action, isFirstLoad) {
    if (action) {
      property.set('sys.lightswitch', action, 'persist')
      if (!isFirstLoad) {
        if (action === SWITCH_OPEN) {
          activity.tts.speak(LIGHT_SWITCH_OPEN).then(() => activity.exit())
        } else if (action === SWITCH_CLOSE) {
          activity.tts.speak(LIGHT_SWITCH_CLOSE).then(() => activity.exit())
        } else {
          activity.tts.speak(CONFIG_FAILED).then(() => activity.exit())
        }
      }
    }
  }

  function onWakeupSwitchStatusChanged (action, isFirstLoad) {
    if (action) {
      property.set('sys.awakeswitch', action, 'persist')
      if (!isFirstLoad) {
        if (action === SWITCH_OPEN) {
          activity.tts.speak(WAKE_SOUND_OPEN).then(() => activity.exit())
        } else if (action === SWITCH_CLOSE) {
          activity.tts.speak(WAKE_SOUND_CLOSE).then(() => activity.exit())
        } else {
          activity.tts.speak(CONFIG_FAILED).then(() => activity.exit())
        }
      }
    }
  }

  function nightMode (action) {
    logger.info('nightMode---->: ' + action)
    if (action === 'open') {
      refreshNightMode(true)
    } else if (action === 'close') {
      clearTimeout(this.waitForCloseTimer)
      clearTimeout(this.waitForNextTimer)
      setNightMode(false)
    }
    return Promise.resolve()
  }

  function checkTime () {
    var curDate = new Date()
    var curHour = curDate.getHours()
    var curMinute = curDate.getMinutes()
    var start = this.startTime.split(':')
    var end = this.endTime.split(':')
    if (start.length !== 2 || end.length !== 2) {
      return false
    }
    var startHour = Number(start[0])
    var startMinute = Number(start[1])
    var endHour = Number(end[0])
    var endMinute = Number(end[1])
    logger.info('checkTime---->curTime: ' + curHour + ':' + curMinute)
    logger.info('checkTime---->startTime: ' + this.startTime)
    logger.info('checkTime---->endTime: ' + this.endTime)
    if (startHour > endHour ||
      (startHour === endHour && startMinute > endMinute)) {
      if ((curHour > startHour) ||
        (curHour === startHour && curMinute >= startMinute) ||
        (curHour < endHour) ||
        (curHour === endHour && curMinute <= endMinute)) {
        logger.info('checkTime---->:in diff day and in nightmode time range ')
        if (curHour >= endHour) {
          this.deltaTime = ((endHour + 24 - curHour) * 60 * 60 * 1000 + (endMinute - curMinute + 1) * 60 * 1000)
        } else {
          this.deltaTime = ((endHour - curHour) * 60 * 60 * 1000 + (endMinute - curMinute + 1) * 60 * 1000)
        }
        logger.info('checkTime,in diff day and in nightmode time range  && closeDeltaTime is : ' + this.deltaTime)
        return true
      } else {
        this.nextDeltaTime = ((startHour - curHour) * 60 * 60 * 1000 + (startMinute - curMinute + 1) * 60 * 1000)
        logger.info('checkTime,in diff day and not in nightmode time range  && nextDeltaTime is : ' + this.nextDeltaTime)
      }
    } else {
      if ((curHour > startHour || (curHour === startHour && curMinute >= startMinute)) &&
      ((curHour < endHour) || (curHour === endHour && curMinute <= endMinute))) {
        logger.info('checkTime---->:in same day and in nightmode time range ')
        this.deltaTime = ((endHour - curHour) * 60 * 60 * 1000 + (endMinute - curMinute + 1) * 60 * 1000)
        logger.info('checkTime,in same day and in nightmode time range  && closeDeltaTime is : ' + this.deltaTime)
        return true
      } else {
        if (curHour >= endHour) {
          this.nextDeltaTime = ((startHour + 24 - curHour) * 60 * 60 * 1000 + (startMinute - curMinute + 1) * 60 * 1000)
        } else {
          this.nextDeltaTime = ((startHour - curHour) * 60 * 60 * 1000 + (startMinute - curMinute + 1) * 60 * 1000)
        }
        logger.info('checkTime, in same day and not in nightmode time range  && nextDeltaTime is : ' + this.nextDeltaTime)
      }
    }
    return false
  }

  function refreshNightMode (isForce) {
    logger.info('refreshNightMode---->isForce: ' + isForce)
    if (checkTime()) {
      setNightMode(true)
      waitForCloseNightMode()
    } else {
      setNightMode(false)
      waitForNextNightMode()
    }
  }

  function setNightMode (isOpen) {
    property.set('sys.nightmode.status', isOpen ? 'open' : 'close', 'persist')
    if (isOpen) {
      this.inNightMode = true
    } else {
      this.inNightMode = false
    }
  }

  function waitForCloseNightMode () {
    logger.info('waitForCloseNightMode---->deltaTime: ' + this.deltaTime)
    this.waitForCloseTimer = setTimeout(() => {
      refreshNightMode(false)
    }, this.deltaTime)
  }

  function waitForNextNightMode () {
    logger.info('waitForNextNightMode---->nextDeltaTime: ' + this.nextDeltaTime)
    this.waitForNextTimer = setTimeout(() => {
      refreshNightMode(true)
    }, this.nextDeltaTime)
  }

  function getParams (queryString) {
    var queryArr = queryString.split('&')
    var params = {}
    for (var i = 0; i < queryArr.length; i++) {
      var pair = queryArr[i].split('=')
      if (pair.length !== 2) continue
      params[pair[0]] = pair[1]
    }
    return params
  }
}
