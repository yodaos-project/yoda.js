'use strict'

var test = require('tape')
var helper = require('../../helper')
var NightMode = require(`${helper.paths.runtime}/lib/component/dnd-mode`)
var mock = require('../../helper/mock')

test('dnd mode check', function (t) {
  var life = {}
  var visibility = {}
  var broadcast = {}
  // init
  mock.restore()
  mock.mockReturns(broadcast, 'registerBroadcastChannel', undefined)
  mock.mockReturns(visibility, 'getCurrentAppId', undefined)
  mock.mockReturns(life, 'on', undefined)
  function callDNDMode (option, appId, shouldBoardcast, statusExpected) {
    console.log('dnd mode test: ', arguments)
    var broadcasted = false
    mock.restore()
    mock.mockReturns(broadcast, 'dispatch', (status) => {
      broadcasted = true
      if (shouldBoardcast !== null) {
        if (shouldBoardcast) {
          if (statusExpected !== null) {
            t.ok(status === statusExpected, `should be ${statusExpected}`)
          }
        } else {
          t.fail('broadcast.dispatch should not been called')
        }
      }
    })
    mock.mockReturns(visibility, 'getCurrentAppId', appId)
    mock.mockReturns(life, 'on', undefined)
    nightMode.setOption(option)
    if (shouldBoardcast && !broadcasted) {
      t.fail('should boardcast')
    }
  }
  var nightMode = new NightMode(
    {
      component:
      {
        lifetime: life,
        visibility: visibility,
        broadcast: broadcast
      }
    })
  nightMode.init()
  var startTime
  var endTime
  var option = {}

  function switchOff () {
    option.action = 'close'
    option.weekSettig = '111111'
    startTime = new Date()
    startTime.setHours(startTime.getHours() - 2)
    endTime = new Date()
    endTime.setHours(endTime.getHours() - 1)
    option.startTime = `${startTime.getHours()}:00`
    option.endTime = `${endTime.getHours()}:00`
    callDNDMode(option, null, null, null)
  }

  function switchOn () {
    option.action = 'open'
    option.weekSettig = '111111'
    option.startTime = '00:00'
    option.endTime = '00:00'
    callDNDMode(option, null, null, null)
  }

  switchOn()
  switchOff()

  // dnd mode turn on: start time equals end time
  startTime = new Date()
  endTime = new Date()
  option = {}
  option.action = 'open'
  option.weekSettig = '111111'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode turn on, now:${new Date()}, option: ${JSON.stringify(option)}`)
  callDNDMode(option, null, true, 'on')

  // wait for entering into dnd mode  because app stack is not empty
  callDNDMode(option, 'any-app', false, null)

  switchOff()

  // dnd mode turn on: end time is one hour later than start time
  startTime = new Date()
  endTime = new Date()
  endTime.setHours(endTime.getHours() + 1)
  option = {}
  option.action = 'open'
  option.weekSettig = '1111111'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode turn on, now:${new Date()}, option: ${JSON.stringify(option)}`)
  callDNDMode(option, null, true, 'on')

  switchOff()

  // dnd mode time check error
  startTime = new Date()
  startTime.setHours(startTime.getHours() + 1)
  endTime = new Date()
  endTime.setHours(endTime.getHours() + 2)
  option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode time check error, now:${new Date()}, option: ${JSON.stringify(option)}`)
  callDNDMode(option, null, false, null)

  switchOff()

  // dnd mode cross-day time setting: end time is one hour earlier than the start time
  startTime = new Date()
  startTime.setHours(startTime.getHours() + 2)
  endTime = new Date()
  endTime.setHours(endTime.getHours() + 1)
  option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode cross-day time check, now:${new Date()}, option: ${JSON.stringify(option)}`)
  callDNDMode(option, null, true, 'on')

  switchOff()

  // dnd mode is expired
  startTime = new Date()
  startTime.setHours(startTime.getHours() - 2)
  endTime = new Date()
  endTime.setHours(endTime.getHours() - 1)
  option = {}
  option.action = 'open'
  option.startTime = `${startTime.getHours()}:00`
  option.endTime = `${endTime.getHours()}:00`
  console.log(`dnd mode cross-day time check, now:${new Date()}, option: ${JSON.stringify(option)}`)
  callDNDMode(option, null, true, 'off')

  // dnd mode: full day enabled
  option = {}
  option.action = 'open'
  option.startTime = `00:00`
  option.endTime = `00:00`
  console.log(`dnd mode time check, now:${new Date()}, option: ${JSON.stringify(option)}`)
  callDNDMode(option, null, true, 'on')

  // switch off
  option.action = 'close'
  callDNDMode(option, null, true, 'off')

  // recheck
  nightMode.recheck()

  // error option
  var statusExpected = 'off'
  var dt = new Date()
  if (dt.getHours() >= 23 ||
    dt.getHours() <= 7) {
    statusExpected = 'on'
  }
  option.action = 'xxx' // defalut value is close
  option.startTime = `ab` // default value is 23:00
  option.endTime = null // default value is 7:00
  callDNDMode(option, null, null, statusExpected)

  // option is null
  callDNDMode(null, null, null, statusExpected)

  t.end()
})
