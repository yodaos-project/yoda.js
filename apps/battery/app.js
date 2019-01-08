'use strict'
var logger = require('logger')('BATTERY')
var util = require('util')
var prop = require('@yoda/property')
var PROP_KEY = 'products.me.battery10.times'
//var TEMPERATURE_LIGHT_RES = 'system://temperature-battery.js'
var TEMPERATURE_LIGHT_RES = 'temperatureBattery.js'
var battery = require('@yoda/battery')
/*{
    "batChargingOnline":true,
    "batLevel":54,
    "batVoltage":3771,
    "batTemp":0,
    "batTimetoEmpty":315,
    "proto":"ROKID_BATTERY"
}*/

var constant = {
    'temperature55': '电池温度过高，已停止充电。',
    'temperature0': '电池温度过低，已停止充电。',
    'lowPower20Free': '电量低于百分之二十，请充电，或打开侧面休眠开关省电。',
    'lowPower20': '电量低于百分之二十，请充电。',
    'lowPower10Free': '电量低于百分之十，即将关机，请充电。',
    'lowerPower10': '电量低于百分之十，即将关机，请充电。',
    'notificationNight': '电量量低于10%，帮我充上电就早点休息吧，迎接元⽓气满满的⼀一天!',
    'notification1': '电量量低于10%，我不不想⾃自动关机⽽而断了了与你的联系，快去帮 我充电或者打开侧⾯面开关进⼊入休眠模式帮我省电吧。',
    'notification2': '电量量低于10%，世界上最遥远的距离就是你 迟迟不不来找我，⽽而我却在痴痴地等着你为我“续命”。',
    'batteryLevelFull': '我现在是满电状态，可以放心使用。',
    'batteryLevel': '当前电量还有%d',
    'timeToFull100': '电池已充满。',
    'timeToFull': '充电完成还需要%d小时%d分钟。',
    'timeToFullDisconnect': '我不在充电状态，当前电量是%d。',
    'timeToFullPowerLow': '当前设备电量%d，充电功率太小，无法正常完成充电。',
    'timeToEmptyConnect': '已连接电源，可以放心使用。',
    'timeToEmptyDisconnect': '当前电量%d，可以使用%d小时%d分钟。',
    'batteryDisconnect20': '电量%d，还能使用%d小时%d分钟。',
    'batteryDisconnect19': '电量不足，我最多只能再使用%d小时%d分钟。',
    'batteryDisconnect19third': '电量量不不⾜足，打开侧⾯面的休眠开关，最⾼高可待机%d小时%d分钟',
    'urls': {
        'PUSH_MOBILE_MSG': 'https://apigwrest.open.rokid.com/v1/device/deviceManager/pushNotificationToMaster'
    }
}
var resourcePath = {
    'powerDisconnect10': './res/lowpower_10.ogg',
    'powerDisconnect20': './res/lower_than_20.ogg',
    'temperature0': './res/battery_temp_low.ogg',
    'temperature50': './res/battery_temp_high.ogg',
    'lowPower20Idle': './res/lowpower_20_idle.ogg',
    'lowPower20Play': './res/lowpower_20_play.ogg',
    'lowPower10': './res/lowpower_10.ogg',
    'lowPower10Media': './res/10BatteryTips.ogg',
    'batteryConnect': './res/battery_connect.ogg',
    'batteryDisconnect': './res/battery_disconnect.ogg'
}

module.exports = function (activity) {
    var STRING_NOBATTERY = '当前产品没有电池，使用期间请连接电源'
    activity.media.on('error', (error) => {
        logger.warn(error)
    })

    function withoutBattery() {
        speakAndExit(STRING_NOBATTERY)
    }

    function queryBatteryStatus() {
        return battery.getBatteryInfo()
    }

    function speakAndExit(text) {
        return activity.tts.speak(text).then(() => {
            activity.exit()
        })
    }

    function powerStatusChange(isOnline, isPlaying, testPercent) {
        logger.log('powerStatusChanged ', isOnline, isPlaying, testPercent)
        notifyMedia(isOnline ? resourcePath.batteryConnect
            : resourcePath.batteryDisconnect, () => {
                if (!isOnline && isPlaying === 'false') {
                    queryBatteryStatus().then(data => {
                        var percent = data.batLevel
                        if (testPercent) {
                            percent = parseInt(testPercent)
                        }
                        var text
                        if (percent >= 20) {//电量%d，还能使用%d小时%d分钟。batteryDisconnect20
                            text = constant.batteryDisconnect20
                        } else {//前三次：电量不足，打开侧面的休眠开关，最高可待机%d小时%d分钟batteryDisconnect19 之后：电量不足，我最多只能在使用%d小时%d分钟。batteryDisconnect19third
                            var times = prop.get(PROP_KEY, 'persistent')
                            times = times && parseInt(times) || 0
                            logger.log('powerStatusChanged percent < 20:', times, typeof (times))
                            if (times < 3) {
                                var h = Math.floor(data.batSleepTimetoEmpty / 60)
                                var m = data.batSleepTimetoEmpty % 60
                                text = util.format(constant.batteryDisconnect19third, h, m)
                                logger.log('powerStatusChanged low than 20:', times)
                                prop.set(PROP_KEY, times + 1, 'persistent')
                            } else {
                                var h = Math.floor(data.batTimetoEmpty / 60)
                                var m = data.batTimetoEmpty % 60
                                text = util.format(constant.batteryDisconnect19, h, m)
                            }
                        }
                        notifyTTS(text)

                    })
                }

            })
    }

    function notifyAndExit(text, callback) {
        logger.log('tts start:', text)
        activity.tts.speak(text).then(() => {
            logger.log('tts end:', text)
            if (typeof (callback) === 'function') {
                callback()
            } else {
                logger.log('notify tts end will exit')
                activity.setBackground()
            }
        })
    }

    function notifyMedia(url, callback) {
        logger.log('notify media will setForeground:', url)
        activity.setForeground().then(() => {
            logger.log('notify media setForeground end will start media:', url)
            activity.media.start(url).then(() => {
                if (typeof (callback) === 'function') {
                    callback()
                    return
                }
                logger.log('notify media callback will setBackground:', url)
                activity.setBackground()
            }).catch(error => {
                logger.warn(error)
            })
        })
    }

    function lowerPower(percent, isPlaying) {
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

    function pushNotification() {
        var date = new Date()
        var h = date.getHours()
        var content
        if (h >= 22 || h <= 7) {//push消息：电量量低于10%，帮我充上电就早点休息 吧，迎接元⽓气满满的⼀一天!
            content = constant.notificationNight
        } else {//push消息：“电量量低于10%，我不不想⾃自动关机⽽而断了了与你的联系，快去帮 我充电或者打开侧⾯面开关进⼊入休眠模式帮我省电吧” / “电量量低于10%，世界上最遥远的距离就是你 迟迟不不来找我，⽽而我却在痴痴地等着你为我“续命”。”(两句句随机出）
            var seed = Math.random()
            logger.error(seed, seed > 0.5 ? constant.notification1 : constant.notification2)
            content = seed > 0.5 ? constant.notification1 : constant.notification2
        }
        var body = {
            'message': content,
            'extra': "{\"sys\":{}}"
        }
        var bodyStr = JSON.stringify(body)
        logger.log('pushNotification:', bodyStr)
        activity.httpgw.request(constant.urls.PUSH_MOBILE_MSG, body, { services: 'rest' }).then((res) => {
            logger.log('pushNotification result:', bodyStr, res)
        })
    }

    function temperatureAbnormal(isHighTemperature) {
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
    function pollingCheckTemperature() {
        if (temperatureTimeId) {
            logger.warn('temperature check timer is started')
            return
        }
        temperatureTimeId = setInterval(function () {
            //check temperature if not safe will notifyLight again or safe will cancel timer
            logger.warn('temperature timer callback will check again')
            queryBatteryStatus().then(data => {
                if (data.batTemp >= 55 || data.batTemp <= 0) {
                    activity.light.play(TEMPERATURE_LIGHT_RES)
                } else {
                    clearInterval(temperatureTimeId)
                }
            })
        }, 30 * 1000)

    }


    function temperatureAbnormalLight(isHighTemperature) {
        logger.warn('temperatureAbnormalLight:', isHighTemperature)
        activity.light.play(TEMPERATURE_LIGHT_RES)
    }

    function notifyTTS(text) {
        logger.log('notifyTTS', text)
        activity.setForeground().then(() => {
            logger.log('notify tts setForeground end will start tts:', text)
            activity.tts.speak(text).then(() => {
                logger.log('notify tts callback will setBackground:', text)
                activity.setBackground()
            }).catch(error => {
                logger.error(error)
            })
        })
    }

    function batteryUseTime() {
        queryBatteryStatus().then(data => {
            if (data.batSupported === false){
                withoutBattery()
               return 
            }
            if (data.batChargingOnline) {//标识是否处在充电状态（连接电源且充电功率>输出功率
                notifyTTS(constant.timeToEmptyConnect)
            } else {
                var useTime = data.batTimetoEmpty
                var h = Math.floor(useTime / 60)
                var m = useTime % 60
                var text = util.format(constant.timeToEmptyDisconnect, data.batLevel || 100, h, m)
                notifyTTS(text)
            }

        })
    }

    function batteryLevel() {
        queryBatteryStatus().then(data => {
            if (!data) {
                logger.warn('queryBatteryStatus failed')
                return
            }
            if (data.batSupported === false){
                withoutBattery()
               return 
            }
            if (data.batLevel && data.batLevel == 100) {
                notifyTTS(constant.batteryLevelFull)
            } else {
                notifyTTS(util.format(constant.batteryLevel, data.batLevel || 0))
            }
        })
    }

    function batteryCharging(isCharingError) {
        queryBatteryStatus().then(batteryState => {
            logger.log('intent batteryCharging:', JSON.stringify(batteryState), isCharingError)
            if (batteryState.batSupported === false){
                withoutBattery()
               return 
            }
            var text
            if (batteryState.batChargingOnline && batteryState.batTimetoFull !== -1) {
                if (batteryState.batLevel && batteryState.batLevel == 100) {
                    text = constant.timeToFull100
                } else {
                    var timeToFull = batteryState.batTimetoFull || 0
                    var h = Math.floor(timeToFull / 60)
                    var m = timeToFull % 60
                    text = util.format(constant.timeToFull, h, m)
                }
            } else {
                if (batteryState.batChargingOnline && batteryState.batTimetoFull === -1) { //isAcconnect 标识电源是否连接
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
                case battery_usetime:
                    batteryUseTime()
                    break
                case battery_charging:
                    batteryCharging()
                    break
                case battery_level:
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
