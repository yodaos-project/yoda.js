'use strict'

var test = require('tape')
var helper = require('../../helper')
var NightMode = require(`${helper.paths.runtime}/lib/component/night-mode`)
var mock = require('../../helper/mock')

test('night mode check', function (t) {
  var light = {}
  var sound = {}
  var life = {}

  // init
  mock.restore()
  mock.mockReturns(light, 'setNightMode', undefined)
  mock.mockReturns(sound, 'setVolume', undefined)
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)

  var nightMode = new NightMode(light, sound, life)
  nightMode.init()

  mock.restore()
  // night mode turn on
  mock.mockReturns(light, 'setNightMode', (isNightMode) => {
    t.ok(isNightMode, 'light night mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    t.ok(volume === 10, 'sound night mode')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  var startTime = new Date()
  var endTime = new Date()
  var option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:59`
  nightMode.setOption(option)

  mock.restore()
  // wait for entering into night mode  because app stack is not empty
  mock.mockReturns(light, 'setNightMode', (isNightMode) => {
    t.fail('app stack is not empty, but light night mode was set')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    t.fail('app stack is not empty, but sound night mode was set')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', 'some-app')
  nightMode.setOption(option)

  mock.restore()
  // wait for exiting night mode  because app stack is not empty
  mock.mockReturns(light, 'setNightMode', (isNightMode) => {
    t.fail('app stack is not empty, but light night mode was set')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    t.fail('app stack is not empty, but sound night mode was set')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', 'some-app')
  option.action = 'open'
  startTime.setMinutes(startTime.getMinutes() + 1)
  endTime.setHours(endTime.getHours() + 1)
  option.startTime = `${startTime.getHours()}:${startTime.getMinutes()}`
  option.endTime = `${endTime.getHours()}:${endTime.getMinutes()}`
  nightMode.setOption(option)

  mock.restore()
  // exit night mode
  mock.mockReturns(light, 'setNightMode', (isNightMode) => {
    t.ok(!isNightMode, 'light exit night mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    t.ok(volume === 50, 'sound exit night mode')
  })
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  nightMode.setOption(option)

  mock.restore()
  // night mode turn on again
  mock.mockReturns(light, 'setNightMode', (isNightMode) => {
    t.ok(isNightMode, 'light night mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    t.ok(volume === 10, 'sound night mode')
  })
  mock.mockReturns(sound, 'getVolume', 50)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  startTime = new Date()
  endTime = new Date()
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:59`
  nightMode.setOption(option)

  mock.restore()
  // switch off
  mock.mockReturns(light, 'setNightMode', (isNightMode) => {
    t.ok(!isNightMode, 'light exit night mode')
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    t.ok(volume === 50, 'sound exit night mode')
  })
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  option.action = 'close'
  startTime = new Date()
  endTime = new Date()
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:59`
  nightMode.setOption(option)

  mock.restore()
  // error option
  mock.mockReturns(light, 'setNightMode', (isNightMode) => {
    var dt = new Date()
    if (dt.getHours() >= 23 || dt.getHours() <= 7) {
      t.ok(isNightMode, 'light enter night mode')
    } else {
      t.ok(!isNightMode, 'light exit night mode')
    }
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    var dt = new Date()
    if (dt.getHours() >= 23 || dt.getHours() <= 7) {
      t.ok(volume === 50, 'sound enter night mode')
    } else {
      t.ok(volume !== 50, 'sound exit night mode')
    }
  })
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  option.action = 'xxx' // defalut value is close
  startTime.setMinutes(startTime.getMinutes() - 1)
  option.startTime = `ab` // default value is 23:00
  option.endTime = null // default value is 7:00
  nightMode.setOption(option)

  mock.restore()
  // null option
  mock.mockReturns(light, 'setNightMode', (isNightMode) => {
    var dt = new Date()
    if (dt.getHours() >= 23 || dt.getHours() <= 7) {
      t.ok(isNightMode, 'light enter night mode')
    } else {
      t.ok(!isNightMode, 'light exit night mode')
    }
  })
  mock.mockReturns(sound, 'setVolume', (volume) => {
    var dt = new Date()
    if (dt.getHours() >= 23 || dt.getHours() <= 7) {
      t.ok(volume === 50, 'sound enter night mode')
    } else {
      t.ok(volume !== 50, 'sound exit night mode')
    }
  })
  mock.mockReturns(sound, 'getVolume', 10)
  mock.mockReturns(life, 'getCurrentAppId', undefined)
  option = undefined
  nightMode.setOption(option)

  t.end()
})
