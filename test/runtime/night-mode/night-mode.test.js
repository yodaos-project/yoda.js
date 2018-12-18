'use strict'

var test = require('tape')
var helper = require('../../helper')
var NightMode = require(`${helper.paths.runtime}/lib/component/night-mode`)
var mock = require('../../helper/mock')

test('night mode check', function (t) {
  var light = new Object()
  var sound = new Object()
  var life = new Object()

  //init
  mock.restore()
  mock.mockReturns(light, "setNightMode", undefined)
  mock.mockReturns(sound, "setVolume", undefined)
  mock.mockReturns(sound, "getVolume", 50)
  mock.mockReturns(life, "getCurrentAppId", undefined)

  var nightMode = new NightMode(light, sound, life)
  nightMode.init()
  


  mock.restore()
  //night mode turn on
  mock.mockReturns(light, "setNightMode", (isNightMode) => {
    t.ok(isNightMode, "light night mode")
  })
  mock.mockReturns(sound, "setVolume", (volume) => {
    t.ok(volume === 10, "sound night mode")
  })
  mock.mockReturns(sound, "getVolume", 50)
  mock.mockReturns(life, "getCurrentAppId", undefined)
  var dt = new Date()
  var option = new Object()
  option.action = 'open'
  option.startTime = `${dt.getHours()}:00`
  option.endTime = `${dt.getHours()}:59`
  nightMode.setOption(option)
  


  mock.restore()
  //wait for entering into night mode  because app stack is not empty
  mock.mockReturns(light, "setNightMode", (isNightMode) => {
    t.fail("app stack is not empty, but light night mode was set")
  })
  mock.mockReturns(sound, "setVolume", (volume) => {
    t.fail("app stack is not empty, but sound night mode was set")
  })
  mock.mockReturns(sound, "getVolume", 50)
  mock.mockReturns(life, "getCurrentAppId", "some-app")
  nightMode.setOption(option)




  mock.restore()
  //wait for exiting night mode  because app stack is not empty
  mock.mockReturns(light, "setNightMode", (isNightMode) => {
    t.fail("app stack is not empty, but light night mode was set")
  })
  mock.mockReturns(sound, "setVolume", (volume) => {
    t.fail("app stack is not empty, but sound night mode was set")
  })
  mock.mockReturns(sound, "getVolume", 50)
  mock.mockReturns(life, "getCurrentAppId", "some-app")
  option.action = 'open'
  dt.setMinutes(dt.getMinutes() - 1)
  option.startTime = `${dt.getHours()}:${dt.getMinutes()}`
  option.endTime = `${dt.getHours()}:${dt.getMinutes()}`
  nightMode.setOption(option)
  


  mock.restore()
  //exit night mode
  mock.mockReturns(light, "setNightMode", (isNightMode) => {
    t.ok(!isNightMode, "light exit night mode")
  })
  mock.mockReturns(sound, "setVolume", (volume) => {
    t.ok(volume === 50, "sound exit night mode")
  })
  mock.mockReturns(sound, "getVolume", 10)
  mock.mockReturns(life, "getCurrentAppId", undefined)
  nightMode.setOption(option)

  mock.restore()
  //switch off
  mock.mockReturns(light, "setNightMode", (isNightMode) => {
    t.ok(!isNightMode, "light exit night mode")
  })
  mock.mockReturns(sound, "setVolume", (volume) => {
    t.ok(volume === 50, "sound exit night mode")
  })
  mock.mockReturns(sound, "getVolume", 10)
  mock.mockReturns(life, "getCurrentAppId", undefined)
  option.action = 'close'
  dt.setMinutes(dt.getMinutes() - 1)
  option.startTime = `${dt.getHours()}:${dt.getMinutes()}`
  option.endTime = `${dt.getHours()}:${dt.getMinutes()}`
  nightMode.setOption(option)
  
  t.end()
})
