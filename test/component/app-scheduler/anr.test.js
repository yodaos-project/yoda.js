var test = require('tape')

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

  var now = Date.now()
  scheduler.createApp(appId)
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 1000
      mm.mockReturns(Date, 'now', now)
      return scheduler.anrSentinel()
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 15 * 1000
      mm.mockReturns(Date, 'now', now)
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

  var now = Date.now()
  scheduler.createApp(appId)
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 1000
      mm.mockReturns(Date, 'now', now)
      return scheduler.anrSentinel()
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      mm.mockReturns(Date, 'now', now + 10 * 1000)
      scheduler.appMap[appId].refreshAnr()

      now += 15 * 1000
      mm.mockReturns(Date, 'now', now)
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

  var now = Date.now()
  scheduler.createApp(appId, 'default', { anrEnabled: false })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 1000
      mm.mockReturns(Date, 'now', now)
      return scheduler.anrSentinel()
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      now += 15 * 1000
      mm.mockReturns(Date, 'now', now)
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
