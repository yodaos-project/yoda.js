var test = require('tape')
var path = require('path')

var helper = require('../../helper')
var bootstrap = require('../../bootstrap')
var mm = require('../../helper/mock')

test('shall create light app', t => {
  var target = path.join(helper.paths.fixture, 'noop-app')
  t.plan(4)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'light')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: target
  })
  var scheduler = tt.component.appScheduler

  t.looseEqual(scheduler.appStatus[appId], null)
  var promise = scheduler.createApp(appId)
  t.strictEqual(scheduler.appStatus[appId], 'creating')

  setTimeout(() => { /** FIXME: child_process.fork doesn't trigger next tick */ }, 1000)
  promise
    .then(app => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('light app exits on start up', t => {
  var target = path.join(helper.paths.fixture, 'crash-on-startup-app')
  t.plan(5)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
  mm.mockReturns(tt.component.appLoader, 'getTypeOfApp', 'light')
  mm.mockReturns(tt.component.appLoader, 'getAppManifest', {
    appHome: target
  })
  var scheduler = tt.component.appScheduler

  t.looseEqual(scheduler.appStatus[appId], null)
  var promise = scheduler.createApp(appId)
  t.strictEqual(scheduler.appStatus[appId], 'creating')

  setTimeout(() => { /** FIXME: child_process.fork doesn't trigger next tick */ }, 1000)
  promise
    .then(() => {
      t.fail('unreachable path')
      t.end()
    }, err => {
      t.throws(() => {
        throw err
      }, 'App exits on startup')

      t.looseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'exited')

      t.end()
    })
})
