var test = require('tape')
var _ = require('@yoda/util')._

var bootstrap = require('./bootstrap')
var mm = require('../../helper/mock')

test('launch and suspend app', t => {
  t.plan(6)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'test')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: 'foobar'
  })
  var scheduler = tt.component.appScheduler

  t.looseEqual(scheduler.appStatus[appId], null)
  var promise = scheduler.createApp(appId)
  t.strictEqual(scheduler.appStatus[appId], 'creating')

  promise
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      return scheduler.suspendApp(appId)
    })
    .then(() => {
      t.looseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'exited')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('trying start app while app is suspending', t => {
  t.plan(7)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'test')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: 'foobar'
  })
  var scheduler = tt.component.appScheduler

  t.looseEqual(scheduler.appStatus[appId], null)
  var promise = scheduler.createApp(appId)
  t.strictEqual(scheduler.appStatus[appId], 'creating')

  promise
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      var promise = scheduler.suspendApp(appId)
      t.strictEqual(scheduler.appStatus[appId], 'suspending')
      return Promise.all([ promise, scheduler.createApp(appId) ])
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')
      return scheduler.suspendApp(appId)
    })
    .then(() => t.end())
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('error thrown on startup', t => {
  t.plan(5)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'startupCrash')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: 'foobar'
  })
  var scheduler = tt.component.appScheduler

  t.looseEqual(scheduler.appStatus[appId], null)
  var promise = scheduler.createApp(appId)
  t.strictEqual(scheduler.appStatus[appId], 'creating')

  promise
    .then(() => {
      t.fail('unreachable path')
      t.end()
    }, err => {
      t.throws(() => {
        throw err
      }, 'Foobar error on startup')

      t.looseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'exited')

      t.end()
    })
})

test('error thrown on suspend', t => {
  t.plan(10)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'deadOnExit')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: 'foobar'
  })
  var scheduler = tt.component.appScheduler

  t.looseEqual(scheduler.appStatus[appId], null)
  var promise = scheduler.createApp(appId)
  t.strictEqual(scheduler.appStatus[appId], 'creating')

  promise
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      return scheduler.suspendApp(appId)
        .catch(err => {
          t.throws(() => {
            throw err
          }, `Suspend app(${appId}) timed out`)
        })
    })
    .then(() => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'error')

      var promise = scheduler.suspendApp(appId, { force: true })
      t.strictEqual(scheduler.appStatus[appId], 'suspending')
      return promise
    })
    .then(() => {
      t.looseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'exited')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('launch and suspend daemon app', t => {
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'test')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: 'foobar'
  })
  var scheduler = tt.component.appScheduler

  scheduler.createApp(appId, { daemon: true })
    .then(() => {
      t.strictEqual(scheduler.appStatus[appId], 'running')
      t.true(scheduler.appLaunchOptions[appId].daemon)

      return scheduler.suspendApp(appId)
    })
    .then(() => {
      t.strictEqual(scheduler.appStatus[appId], 'exited')
      return _.delay(5000)
    })
    .then(() => {
      t.ok(scheduler.appMap[appId] != null)
      /** either creating or running */
      t.ok(['creating', 'running'].indexOf(scheduler.appStatus[appId]) >= 0)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('de-daemonize app', t => {
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'test')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: 'foobar'
  })
  var scheduler = tt.component.appScheduler

  scheduler.createApp(appId, { daemon: true })
    .then(() => {
      t.strictEqual(scheduler.appStatus[appId], 'running')
      t.true(scheduler.appLaunchOptions[appId].daemon)
      scheduler.appLaunchOptions[appId].daemon = false

      return scheduler.suspendApp(appId)
    })
    .then(() => {
      t.strictEqual(scheduler.appStatus[appId], 'exited')
      return _.delay(5000)
    })
    .then(() => {
      t.ok(scheduler.appMap[appId] == null)
      /** neither creating or running */
      t.ok(['creating', 'running'].indexOf(scheduler.appStatus[appId]) < 0)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
