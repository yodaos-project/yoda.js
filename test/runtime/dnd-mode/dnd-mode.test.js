'use strict'

var test = require('tape')
var helper = require('../../helper')
var NightMode = require(`${helper.paths.runtime}/lib/component/dnd-mode`)
var mock = require('../../helper/mock')

test('night mode check', function (t) {
  var light = {}
  var sound = {}
  var life = {}
  // init
  mock.restore()
  mock.mockReturns(light, 'setDNDMode', undefined)
  mock.mockReturns(sound, 'setVolume', undefined)
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)

  var nightMode = new NightMode(light, sound, life)
  nightMode.init()
  var timeZone = (new Date()).getTimezoneOffset() / 60
  var startTime
  var endTime
  var option = {}
  var tag1
  var tag2
  var now = new Date()

  mock.restore()
  // switch off
  mock.mockReturns(light, 'setDNDMode', undefined)
  mock.mockReturns(sound, 'setVolume', undefined)
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  option.action = 'close'
  startTime = new Date()
  startTime.setHours(startTime.getHours() - timeZone)
  endTime = new Date()
  endTime.setHours(endTime.getHours() + 1 - timeZone)
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:59`
  nightMode.setOption(option)

  tag1 = false
  tag2 = false
  mock.restore()
  // night mode turn on
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    tag1 = true
    t.ok(isNightMode, 'light night mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    tag2 = true
    t.ok(volume === 10, 'sound night mode')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  startTime = (now.getHours() - 1 + 24 + 8) % 24
  endTime = (now.getHours() + 1 + 24 + 8) % 24
  option = {}
  option.action = 'open'
  option.startTime = `${startTime}:00`
  option.endTime = `${endTime}:59`
  nightMode.setOption(option)
  console.log(tag1)
  t.ok(tag1, 'light not set 1')
  t.ok(tag2, 'sound not set 1')

  tag1 = false
  tag2 = false
  mock.restore()
  // wait for entering into night mode  because app stack is not empty
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    t.failed('already enabled')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    t.failed('already enabled')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', 'some-app')
  mock.mockReturns(life, 'on', undefined)
  nightMode.setOption(option)

  tag1 = false
  tag2 = false
  mock.restore()
  // switch off
  console.log('switch off')
  mock.mockReturns(light, 'setDNDMode', (isNightMode) => {
    tag1 = true
    t.ok(!isNightMode, 'light exit night mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    tag2 = true
    t.ok(volume === 50, 'sound exit night mode')
  })
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  option.action = 'close'
  startTime = (now.getHours() - 1 + 24 + 8) % 24
  endTime = (now.getHours() + 1 + 24 + 8) % 24
  option.startTime = `${startTime}:00`
  option.endTime = `${endTime}:59`
  nightMode.setOption(option)
  t.ok(tag1, 'light not set 3')
  t.ok(tag2, 'sound not set 3')

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
      t.ok(isNightMode, 'light enter night mode')
    } else {
      t.ok(!isNightMode, 'light exit night mode')
    }
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    var dt = new Date()
    tag2 = true
    if (dt.getHours() - timeZone + 8 >= 23 ||
      dt.getHours() - timeZone + 8 <= 7) {
      t.ok(volume === 50, 'sound enter night mode')
    } else {
      t.ok(volume !== 50, 'sound exit night mode')
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
      t.ok(isNightMode, 'light enter night mode')
    } else {
      t.ok(!isNightMode, 'light exit night mode')
    }
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    var dt = new Date()
    tag2 = true
    if (dt.getHours() - timeZone + 8 >= 23 || dt.getHours() - timeZone + 8 <= 7) {
      t.ok(volume === 50, 'sound enter night mode')
    } else {
      t.ok(volume !== 50, 'sound exit night mode')
    }
  })
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  option = undefined
  nightMode.setOption(option)

  t.end()
})
