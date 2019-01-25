'use strict'
var logger = require('logger')('BATTERY')
var util = require('util')
var prop = require('@yoda/property')
var PROP_KEY = 'rokid.battery10.times'
var TEMPERATURE_LIGHT_RES = 'system://temperatureBattery.js'
var battery = require('@yoda/battery')
var Const = require('./constant.json')
var constant = Const.constant
var resourcePath = Const.resource

module.exports = function (activity) {
  var STRING_NOBATTERY = '当前产品没有电池，使用期间请连接电源'
  activity.media.on('error', (error) => {
    logger.warn(error)
  })

  function withoutBattery () {
    speakAndExit(STRING_NOBATTERY)
  }

  function queryBatteryStatus () {
    return battery.getBatteryInfo()
  }

  function speakAndExit (text) {
    return activity.tts.speak(text)
      .then(() => {
        logger.log('speakAndExit end will exit')
        activity.exit()
      })
  }

  function parseTime (time) {
    if (time < 0) {
      return {
        hour: 0,
        minute: 0
      }
    }
    var h = Math.floor(time / 60)
    var m = time % 60
    if (h < 0) {
      h = 0
    }
    return {
      hour: h,
      minute: m
    }
  }

  function powerStatusChange (isOnline, isPlaying, testPercent) {
    logger.log('powerStatusChanged ', isOnline, isPlaying, testPercent)
    var sound = isOnline ? 'system://power_plug.ogg' : 'system://power_pull.ogg'
    activity.playSound(sound)
      .then(() => {
        if (!isOnline && isPlaying === 'false') {
          queryBatteryStatus()
            .then(data => {
              logger.log('queryBatteryStatus end:', JSON.stringify(data))
              var percent = data.batLevel
              if (testPercent) {
                percent = parseInt(testPercent)
              }
              var text
              var timeObj
              if (percent >= 20) {
                timeObj = parseTime(data.batTimetoEmpty)
                text = util.format(constant.batteryDisconnect20, data.batLevel, timeObj.hour, timeObj.minute)
              } else {
                if (data.batSleepTimetoEmpty < 0 || data.batTimetoEmpty < 0) {
                  logger.log('powerStatusChange invalid battery info will exit:')
                  activity.exit()
                  return
                }
                var times = prop.get(PROP_KEY, 'persist')
                times = times ? parseInt(times) : 0
                logger.log('powerStatusChanged percent < 20:', times, typeof (times))
                if (times < 3) {
                  timeObj = parseTime(data.batSleepTimetoEmpty)
                  text = util.format(constant.batteryDisconnect19third, timeObj.hour, timeObj.minute)
                  logger.log('powerStatusChanged low than 20:', times, timeObj.hour, timeObj.minute)
                  prop.set(PROP_KEY, times + 1, 'persist')
                } else {
                  timeObj = parseTime(data.batTimetoEmpty)
                  text = util.format(constant.batteryDisconnect19, timeObj.hour, timeObj.minute)
                  logger.log('powerStatusChanged low than 20:', times, timeObj.hour, timeObj.minute)
                }
              }
              notifyTTS(text)
            })
        } else {
          logger.log('powerStatusChange will exit', isOnline, isPlaying)
          activity.exit()
        }
      })
  }

  function notifyMedia (url, callback) {
    logger.log('notify media will setForeground:', url)
    activity.media.start(url, { impatient: false })
      .then(() => {
        if (typeof (callback) === 'function') {
          callback()
          return
        }
        logger.log('notify media callback will exit:', url)
        activity.exit()
      })
      .catch(error => {
        logger.warn(error)
      })
  }

  function lowerPower (percent, isPlaying) {
    var url
    if (percent === 10) {
      url = resourcePath.lowPower10
    } else if (percent === 20) {
      if (isPlaying && isPlaying === 'true') {
        url = resourcePath.lowPower20Play
      } else {
        url = resourcePath.lowPower20Idle
      }
    }
    notifyMedia(url)
  }

  function pushNotification () {
    var date = new Date()
    var h = date.getHours()
    var content
    if (h >= 22 || h <= 7) {
      content = constant.notificationNight
    } else {
      var seed = Math.random()
      logger.error(seed, seed > 0.5 ? constant.notification1 : constant.notification2)
      content = seed > 0.5 ? constant.notification1 : constant.notification2
    }
    var body = {
      'message': content,
      'extra': '{"sys":{}}'
    }
    var bodyStr = JSON.stringify(body)
    logger.log('pushNotification:', bodyStr)
    activity.httpgw.request(constant.urls.PUSH_MOBILE_MSG, body, { services: 'rest' })
      .then((res) => {
        logger.log('pushNotification result:', bodyStr, res)
      })
  }

  function temperatureAbnormal (isHighTemperature) {
    logger.warn('temperatureAbnormal:', isHighTemperature)
    var url
    if (isHighTemperature) {
      url = resourcePath.temperature50
    } else {
      url = resourcePath.temperature0
    }
    notifyMedia(url)
  }

  var temperatureTimeId
  function pollingCheckTemperature () {
    if (temperatureTimeId) {
      logger.warn('temperature check timer is started')
      return
    }
    temperatureTimeId = setInterval(function () {
      // check temperature if not safe will notifyLight again or safe will cancel timer
      logger.warn('temperature timer callback will check again')
      queryBatteryStatus()
        .then(data => {
          if (data.batTemp >= 55 || data.batTemp <= 0) {
            activity.light.play(TEMPERATURE_LIGHT_RES)
          } else {
            clearInterval(temperatureTimeId)
          }
        })
    }, 30 * 1000)
  }

  function temperatureAbnormalLight (isHighTemperature) {
    logger.warn('temperatureAbnormalLight:', isHighTemperature)
    activity.light.play(TEMPERATURE_LIGHT_RES)
  }

  function notifyTTS (text) {
    logger.log('notifyTTS', text)
    activity.tts.speak(text)
      .then(() => {
        logger.log('notify tts callback will exit:', text)
        activity.exit()
      })
      .catch(error => {
        logger.error(error)
      })
  }

  function batteryUseTime () {
    queryBatteryStatus()
      .then(data => {
        if (data.batSupported === false) {
          withoutBattery()
          return
        }
        if (data.batChargingOnline) {
          notifyTTS(constant.timeToEmptyConnect)
        } else {
          var useTime = data.batTimetoEmpty
          var timeObj = parseTime(useTime)
          var text = util.format(constant.timeToEmptyDisconnect, data.batLevel || 100, timeObj.hour, timeObj.minute)
          notifyTTS(text)
        }
      })
  }

  function batteryLevel () {
    queryBatteryStatus()
      .then((data) => {
        if (!data) {
          logger.warn('queryBatteryStatus failed')
          return
        }
        if (data.batSupported === false) {
          withoutBattery()
          return
        }
        if (data.batLevel && data.batLevel === 100) {
          notifyTTS(constant.batteryLevelFull)
        } else {
          notifyTTS(util.format(constant.batteryLevel, data.batLevel || 0))
        }
      })
  }

  function batteryCharging (isCharingError) {
    queryBatteryStatus()
      .then(batteryState => {
        logger.log('intent batteryCharging:', JSON.stringify(batteryState), isCharingError)
        if (batteryState.batSupported === false) {
          withoutBattery()
          return
        }
        var text
        if (batteryState.batChargingOnline && batteryState.batTimetoFull !== -1) {
          if (batteryState.batLevel && batteryState.batLevel === 100) {
            text = constant.timeToFull100
          } else {
            var timeToFull = batteryState.batTimetoFull || 0
            var timeObj = parseTime(timeToFull)
            text = util.format(constant.timeToFull, timeObj.hour, timeObj.minute)
          }
        } else {
          if (batteryState.batChargingOnline && batteryState.batTimetoFull === -1) {
            text = util.format(constant.timeToFullPowerLow, batteryState.batLevel || 0)
          } else {
            text = util.format(constant.timeToFullDisconnect, batteryState.batLevel || 0)
          }
          if (isCharingError) {
            text = util.format(constant.timeToFullPowerLow, batteryState.batLevel || 0)
            logger.warn('test battery charging power too low')
          }
        }
        notifyTTS(text)
      })
  }

  activity.on('request', function (nlp, action) {
    var intent = nlp.intent
    logger.log('battery_intent:', intent)
    if (intent) {
      switch (intent) {
        case 'battery_usetime':
          batteryUseTime()
          break
        case 'battery_charging':
          batteryCharging()
          break
        case 'battery_level':
          batteryLevel()
          break
        default:
          logger.warn('unsupported intent:', intent)
      }
    }
  })

  activity.on('url', function (url) {
    if (url && url.pathname) {
      switch (url.pathname) {
        case '/power_on':
          powerStatusChange(true)
          break
        case '/power_off':
          powerStatusChange(false,
            url.query && url.query.is_play,
            url.query && url.query.is_test && url.query.test_percent)
          break
        case '/low_power_20':
          lowerPower(20, url.query && url.query.is_play)
          break
        case '/low_power_10':
          lowerPower(10, url.query && url.query.is_play)
          break
        case '/low_power_8':
          logger.error('random:', Math.random())
          pushNotification()
          break
        case '/temperature_55':
          temperatureAbnormal(true)
          break
        case '/temperature_0':
          temperatureAbnormal(false)
          break
        case '/temperature_light_55':
          temperatureAbnormalLight(true)
          pollingCheckTemperature()
          break
        case '/temperature_light_0':
          temperatureAbnormalLight(false)
          pollingCheckTemperature()
          break
        case '/test_batlevel':
          batteryLevel()
          break
        case '/test_use_time':
          batteryUseTime()
          break
        case '/test_time_full':
          batteryCharging(url.query && url.query.is_charging_error)
          break
        default:
          logger.warn('without this path:', url.pathname)
      }
    } else {
      logger.warn('url is invalid')
    }
  })
}
