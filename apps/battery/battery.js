'use strict'

var battery = require('@yoda/battery')
var prop = require('@yoda/property')
var util = require('util')
var logger = require('logger')('apps/battery/battery')
var queryBatteryStatus = () => battery.getBatteryInfo()

var PROP_KEY = 'rokid.battery10.times'
var CONSTANT = require('./constant.json').constant
var RESOURCE_PATH = require('./constant.json').resource

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

function onPowerStatusChanged (isOnline, isPlaying, testPercent) {
  logger.log(`powerStatusChanged ${isOnline} ${isPlaying} ${testPercent}`)
  if (!isOnline && isPlaying === 'false') {
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
          text = util.format(CONSTANT.batteryDisconnect20, data.batLevel, timeObj.hour, timeObj.minute)
        } else {
          if (data.batSleepTimetoEmpty < 0 || data.batTimetoEmpty < 0) {
            logger.log('powerStatusChange invalid battery info will exit:')
            return false
          }
          var times = prop.get(PROP_KEY, 'persist')
          times = times ? parseInt(times) : 0
          logger.log('powerStatusChanged percent < 20:', times, typeof (times))
          if (times < 3) {
            timeObj = parseTime(data.batSleepTimetoEmpty)
            text = util.format(CONSTANT.batteryDisconnect19third, timeObj.hour, timeObj.minute)
            logger.log('powerStatusChanged low than 20:', times, timeObj.hour, timeObj.minute)
            prop.set(PROP_KEY, times + 1, 'persist')
          } else {
            timeObj = parseTime(data.batTimetoEmpty)
            text = util.format(CONSTANT.batteryDisconnect19, timeObj.hour, timeObj.minute)
            logger.log('powerStatusChanged low than 20:', times, timeObj.hour, timeObj.minute)
          }
        }
        return text
      })
  } else {
    logger.log(`powerStatusChange will exit ${isOnline} ${isPlaying}`)
    return Promise.resolve(false)
  }
}

var temperatureTimeId
function pollingCheckTemperature (onBatteryException) {
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
          onBatteryException(data)
        } else {
          clearInterval(temperatureTimeId)
        }
      })
  }, 30 * 1000)
}

function lowerPower (percent, isPlaying) {
  var url
  if (percent === 10) {
    url = RESOURCE_PATH.lowPower10
  } else if (percent === 20) {
    if (isPlaying && isPlaying === 'true') {
      url = RESOURCE_PATH.lowPower20Play
    } else {
      url = RESOURCE_PATH.lowPower20Idle
    }
  }
  return Promise.resolve(url)
}

function temperatureAbnormal (isHighTemperature) {
  logger.warn('temperatureAbnormal:', isHighTemperature)
  var url
  if (isHighTemperature) {
    url = RESOURCE_PATH.temperature50
  } else {
    url = RESOURCE_PATH.temperature0
  }
  return Promise.resolve(url)
}

function getUseTime () {
  return queryBatteryStatus()
    .then(data => {
      if (data.batSupported === false) {
        return CONSTANT.noBattery
      }
      if (data.batChargingOnline) {
        return CONSTANT.timeToEmptyConnect
      } else {
        var useTime = data.batTimetoEmpty
        var timeObj = parseTime(useTime)
        var text = util.format(CONSTANT.timeToEmptyDisconnect, data.batLevel || 100, timeObj.hour, timeObj.minute)
        return text
      }
    })
}

function getLevel () {
  return queryBatteryStatus()
    .then((data) => {
      if (!data) {
        logger.warn('queryBatteryStatus failed')
        return false
      }
      if (data.batSupported === false) {
        return CONSTANT.noBattery
      }
      if (data.batLevel && data.batLevel === 100) {
        return CONSTANT.batteryLevelFull
      } else {
        return util.format(CONSTANT.batteryLevel, data.batLevel || 0)
      }
    })
}

function isCharging (isCharingError) {
  return queryBatteryStatus()
    .then(batteryState => {
      logger.log('intent batteryCharging:', JSON.stringify(batteryState), isCharingError)
      if (batteryState.batSupported === false) {
        return CONSTANT.noBattery
      }
      var text
      if (batteryState.batChargingOnline && batteryState.batTimetoFull !== -1) {
        if (batteryState.batLevel && batteryState.batLevel === 100) {
          text = CONSTANT.timeToFull100
        } else {
          var timeToFull = batteryState.batTimetoFull || 0
          var timeObj = parseTime(timeToFull)
          text = util.format(CONSTANT.timeToFull, timeObj.hour, timeObj.minute)
        }
      } else {
        if (batteryState.batChargingOnline && batteryState.batTimetoFull === -1) {
          text = util.format(CONSTANT.timeToFullPowerLow, batteryState.batLevel || 0)
        } else {
          text = util.format(CONSTANT.timeToFullDisconnect, batteryState.batLevel || 0)
        }
        if (isCharingError) {
          text = util.format(CONSTANT.timeToFullPowerLow, batteryState.batLevel || 0)
          logger.warn('test battery charging power too low')
        }
      }
      return text
    })
}

exports.PROP_KEY = PROP_KEY
exports.parseTime = parseTime
exports.onPowerStatusChanged = onPowerStatusChanged
exports.pollingCheckTemperature = pollingCheckTemperature
exports.lowerPower = lowerPower
exports.temperatureAbnormal = temperatureAbnormal
exports.getUseTime = getUseTime
exports.getLevel = getLevel
exports.isCharging = isCharging
