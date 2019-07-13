var test = require('tape')
var system = require('@yoda/system')

var bootstrap = require('./bootstrap')
var mm = require('../../helper/mock')

test('should suspend app by force if anr asserted', t => {
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'test')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: 'foobar'
  })
  var scheduler = tt.component.appScheduler

  var now = system.clockGetTime(system.CLOCK_MONOTONIC).sec
  scheduler.createApp(appId)
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 1
      mm.mockReturns(system, 'clockGetTime', { sec: now })
      return scheduler.anrSentinel()
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 15
      mm.mockReturns(system, 'clockGetTime', { sec: now })
      return scheduler.anrSentinel()
    })
    .then(() => {
      t.ok(scheduler.appMap[appId] == null)
      t.strictEqual(scheduler.appStatus[appId], 'exited')
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should refresh anr', t => {
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'test')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: 'foobar'
  })
  var scheduler = tt.component.appScheduler

  var now = system.clockGetTime(system.CLOCK_MONOTONIC).sec
  scheduler.createApp(appId)
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 1
      mm.mockReturns(system, 'clockGetTime', { sec: now })
      return scheduler.anrSentinel()
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      mm.mockReturns(system, 'clockGetTime', { sec: now + 10 })
      scheduler.appMap[appId].refreshAnr()

      now += 15
      mm.mockReturns(system, 'clockGetTime', { sec: now })
      return scheduler.anrSentinel()
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not suspend app by force if anr not enabled', t => {
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'test')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: 'foobar'
  })
  var scheduler = tt.component.appScheduler

  var now = system.clockGetTime(system.CLOCK_MONOTONIC).sec
  scheduler.createApp(appId, { mode: 'default', anrEnabled: false })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 1
      mm.mockReturns(system, 'clockGetTime', { sec: now })
      return scheduler.anrSentinel()
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 15
      mm.mockReturns(system, 'clockGetTime', { sec: now })
      return scheduler.anrSentinel()
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
