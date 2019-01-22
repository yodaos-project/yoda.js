'use strict'

var test = require('tape')
var helper = require('../../helper')
var NightMode = require(`${helper.paths.runtime}/lib/component/dnd-mode`)
var mock = require('../../helper/mock')

var timeZone = -((new Date()).getTimezoneOffset() / 60)

function getDateWithTimeZone (tz) {
  var dt = new Date()
  dt.setHours(dt.getHours() - timeZone + tz)
  return dt
}

test('dnd mode check', function (t) {
  var light = {}
  var sound = {}
  var life = {}
  var flora = {}
  var volumeCb = null
  // init
  mock.restore()
  mock.mockReturns(light, 'setDNDMode', undefined)
  mock.mockReturns(sound, 'setVolume', undefined)
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  mock.mockReturns(flora, 'subscribe', (name, cb) => {
    volumeCb = cb
  })

  var nightMode = new NightMode({ component: {lifetime: life, light: light, sound: sound, flora: flora} })
  nightMode.init()
  var startTime
  var endTime
  var option = {}
  var tag1
  var tag2

  function switchOff () {
    mock.restore()
    // switch off
    mock.mockReturns(light, 'setDNDMode', undefined)
    mock.mockReturns(sound, 'setVolume', undefined)
    mock.mockReturns(sound, 'getVolume', 10)
    mock.mockReturns(life, 'getCurrentAppId', undefined)
    mock.mockReturns(life, 'on', undefined)
    option.action = 'close'
    startTime = getDateWithTimeZone(8)
    startTime.setHours(startTime.getHours() - 2)
    endTime = getDateWithTimeZone(8)
    endTime.setHours(endTime.getHours() - 1)
    option.startTime = `${startTime.getHours()}:00`
    option.endTime = `${endTime.getHours()}:00`
    console.log(`dnd mode switch off, now:${new Date()}, option: ${JSON.stringify(option)}`)
    nightMode.setOption(option)
  }
  switchOff()

  tag1 = false
  tag2 = false
  mock.restore()
  // dnd mode turn on
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    tag1 = true
    t.ok(isNightMode, 'light dnd mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    tag2 = true
    t.ok(volume === 10, 'sound dnd mode')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  mock.mockReturns(flora, 'subscribe', (name, cb) => {
    volumeCb = cb
  })

  startTime = getDateWithTimeZone(8)
  endTime = getDateWithTimeZone(8)
  option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode turn on, now:${new Date()}, option: ${JSON.stringify(option)}`)
  nightMode.setOption(option)
  console.log(tag1)
  t.ok(tag1, 'light not set 1 hour')
  t.ok(tag2, 'sound not set 1 hour')
  volumeCb('system', 50)

  tag1 = false
  tag2 = false
  mock.restore()
  // wait for entering into dnd mode  because app stack is not empty
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    t.fail('already enabled')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    t.fail('already enabled')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', 'some-app')
  mock.mockReturns(life, 'on', undefined)
  nightMode.setOption(option)

  switchOff()

  tag1 = false
  tag2 = false
  mock.restore()
  // dnd mode turn on
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    tag1 = true
    t.ok(isNightMode, 'light dnd mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    tag2 = true
    t.ok(volume === 10, 'sound dnd mode')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  startTime = getDateWithTimeZone(8)
  endTime = getDateWithTimeZone(8)
  endTime.setHours(endTime.getHours() + 1)
  option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode turn on, now:${new Date()}, option: ${JSON.stringify(option)}`)
  nightMode.setOption(option)
  console.log(tag1)
  t.ok(tag1, 'light not set: all day')
  t.ok(tag2, 'sound not set: all day')

  switchOff()

  tag1 = false
  tag2 = false
  mock.restore()
  // dnd mode time check error
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    tag1 = true
    t.fail('light time check error')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    tag2 = true
    t.fail('sound time check error')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  startTime = getDateWithTimeZone(8)
  startTime.setHours(startTime.getHours() + 1)
  endTime = getDateWithTimeZone(8)
  endTime.setHours(endTime.getHours() + 2)
  option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode time check error, now:${new Date()}, option: ${JSON.stringify(option)}`)
  nightMode.setOption(option)
  t.ok(!tag1, 'light set: time check error')
  t.ok(!tag2, 'sound set: time check error')

  switchOff()

  tag1 = false
  tag2 = false
  mock.restore()
  // dnd mode cross-day time
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    tag1 = true
    t.ok(isNightMode, 'light dnd mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    tag2 = true
    t.ok(volume === 10, 'sound dnd mode')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  startTime = getDateWithTimeZone(8)
  startTime.setHours(startTime.getHours() + 2)
  endTime = getDateWithTimeZone(8)
  endTime.setHours(endTime.getHours() + 1)
  option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode cross-day time check, now:${new Date()}, option: ${JSON.stringify(option)}`)
  nightMode.setOption(option)
  t.ok(tag1, 'light set: cross-day time error')
  t.ok(tag2, 'sound set: cross-day time error')

  switchOff()

  tag1 = false
  tag2 = false
  mock.restore()
  // dnd mode is expired
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    tag1 = true
    t.ok(!isNightMode, 'light dnd mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    tag2 = true
    t.ok(volume > 10, 'sound dnd mode')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  startTime = getDateWithTimeZone(8)
  startTime.setHours(startTime.getHours() - 2)
  endTime = getDateWithTimeZone(8)
  endTime.setHours(endTime.getHours() - 1)
  option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode cross-day time check, now:${new Date()}, option: ${JSON.stringify(option)}`)
  nightMode.setOption(option)
  t.ok(!tag1, 'light set: expired time error')
  t.ok(!tag2, 'sound set: expired time error')

  tag1 = false
  tag2 = false
  mock.restore()
  // dnd mode is ok
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    tag1 = true
    t.ok(isNightMode, 'light dnd mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    tag2 = true
    t.ok(volume === 10, 'sound dnd mode')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  startTime = getDateWithTimeZone(8)
  endTime = getDateWithTimeZone(8)
  option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode time check, now:${new Date()}, option: ${JSON.stringify(option)}`)
  nightMode.setOption(option)
  t.ok(tag1, 'light set: ok time error')
  t.ok(tag2, 'sound set: ok time error')

  tag1 = false
  tag2 = false
  mock.restore()
  // switch off
  console.log('switch off')
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    tag1 = true
    t.ok(!isNightMode, 'light exit dnd mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    tag2 = true
    t.ok(volume === 50, 'sound exit dnd mode')
  })
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  option.action = 'close'
  nightMode.setOption(option)
  t.ok(tag1, 'light not set, turn off')
  t.ok(tag2, 'sound not set, turn off')

  // recheck
  nightMode.recheck()

  tag1 = false
  tag2 = false
  mock.restore()
  // error option
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    var dt = new Date()
    tag1 = true
    if (dt.getHours() - timeZone + 8 >= 23 ||
      dt.getHours() - timeZone + 8 <= 7) {
      t.ok(isNightMode, 'light enter dnd mode')
    } else {
      t.ok(!isNightMode, 'light exit dnd mode')
    }
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    var dt = new Date()
    tag2 = true
    if (dt.getHours() - timeZone + 8 >= 23 ||
      dt.getHours() - timeZone + 8 <= 7) {
      t.ok(volume === 50, 'sound enter dnd mode')
    } else {
      t.ok(volume !== 50, 'sound exit dnd mode')
    }
  })
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  option.action = 'xxx' // defalut value is close
  option.startTime = `ab` // default value is 23:00
  option.endTime = null // default value is 7:00
  nightMode.setOption(option)

  tag1 = false
  tag2 = false
  mock.restore()
  // null option
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    var dt = new Date()
    tag1 = true
    if (dt.getHours() - timeZone + 8 >= 23 ||
      dt.getHours() - timeZone + 8 <= 7) {
      t.ok(isNightMode, 'light enter dnd mode')
    } else {
      t.ok(!isNightMode, 'light exit dnd mode')
    }
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    var dt = new Date()
    tag2 = true
    if (dt.getHours() - timeZone + 8 >= 23 || dt.getHours() - timeZone + 8 <= 7) {
      t.ok(volume === 50, 'sound enter dnd mode')
    } else {
      t.ok(volume !== 50, 'sound exit dnd mode')
    }
  })
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  option = undefined
  nightMode.setOption(option)

  t.end()
})
