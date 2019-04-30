'use strict'

var Application = require('@yodaos/application').Application
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis

var logger = require('logger')('@battery')
var util = require('util')
var path = require('path')
var prop = require('@yoda/property')
var battery = require('@yoda/battery')
var _ = require('@yoda/util')._
var MediaPlayer = require('@yoda/multimedia').MediaPlayer

var Const = require('./constant.json')

var PROP_KEY = 'rokid.battery10.times'
var TEMPERATURE_LIGHT_RES = 'system://temperatureBattery.js'
var constant = Const.constant
var resourcePath = Const.resource

function queryBatteryStatus () {
  return battery.getBatteryInfo()
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

function playMediaAsync (url) {
  return new Promise((resolve, reject) => {
    if (!path.isAbsolute(url)) {
      url = path.resolve(url)
    }
    logger.log('notify media:', url)
    var player = new MediaPlayer()
    player.start(url)
    player.on('playbackcomplete', resolve)
    player.on('error', reject)
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
  playMediaAsync(url)
}

function temperatureAbnormal (isHighTemperature) {
  logger.warn('temperatureAbnormal:', isHighTemperature)
  var url
  if (isHighTemperature) {
    url = resourcePath.temperature50
  } else {
    url = resourcePath.temperature0
  }
  playMediaAsync(url)
}

module.exports = function (api) {
  var speechSynthesis = new SpeechSynthesis(api)
  function speakAsync (text) {
    logger.log('speak:', text)
    return new Promise((resolve, reject) => {
      speechSynthesis.speak(text)
        .on('error', reject)
        .on('cancel', resolve)
        .on('end', resolve)
    })
  }

  function withoutBattery (focus) {
    speakAndAbandon(constant.batteryNotEnabled, focus)
  }

  function speakAndAbandon (text, focus) {
    return speakAsync(text).then(
      () => focus.abandon(),
      err => {
        logger.error('unexpected error on speech synthesis', err.stack)
        focus.abandon()
      })
  }

  function powerStatusChange (isOnline, isPlaying, testPercent) {
    logger.log('powerStatusChanged ', isOnline, isPlaying, testPercent)
    var sound = isOnline ? '/opt/media/power_plug.ogg' : '/opt/media/power_pull.ogg'
    playMediaAsync(sound)
      .then(() => {
        if (isOnline || isPlaying !== 'false') {
          logger.log('powerStatusChange will exit', isOnline, isPlaying)
          // api.exit()
          return
        }
        return queryBatteryStatus()
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
                // api.exit()
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
            speakAsync(text)
          })
      })
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
            api.effect.play(TEMPERATURE_LIGHT_RES)
          } else {
            clearInterval(temperatureTimeId)
          }
        })
    }, 30 * 1000)
  }

  function temperatureAbnormalLight (isHighTemperature) {
    logger.warn('temperatureAbnormalLight:', isHighTemperature)
    api.effect.play(TEMPERATURE_LIGHT_RES)
  }

  function batteryUseTime () {
    queryBatteryStatus()
      .then(data => {
        if (data.batSupported === false) {
          withoutBattery()
          return
        }
        if (data.batChargingOnline) {
          speakAsync(constant.timeToEmptyConnect)
        } else {
          var useTime = data.batTimetoEmpty
          var timeObj = parseTime(useTime)
          var text = util.format(constant.timeToEmptyDisconnect, data.batLevel || 100, timeObj.hour, timeObj.minute)
          speakAsync(text)
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
          speakAsync(constant.batteryLevelFull)
        } else {
          speakAsync(util.format(constant.batteryLevel, data.batLevel || 0))
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
        speakAsync(text)
      })
  }

  function feedback (pathname, query) {
    switch (pathname) {
      case '/battery_usetime':
        batteryUseTime()
        break
      case '/battery_charging':
        batteryCharging()
        break
      case '/battery_level':
        batteryLevel()
        break
      case '/power_on':
        powerStatusChange(true)
        break
      case '/power_off':
        powerStatusChange(false,
          _.get(query, 'is_play'),
          query && query.is_test && query.test_percent)
        break
      case '/low_power_20':
        lowerPower(20, _.get(query, 'is_play'))
        break
      case '/low_power_10':
        lowerPower(10, _.get(query, 'is_play'))
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
      default:
        logger.warn('unknown pathname:', pathname)
    }
  }

  var app = Application({
    url: function url (url) {
      feedback(url.pathname, url.query)
    }
  }, api)

  return app
}
