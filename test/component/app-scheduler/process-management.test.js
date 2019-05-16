var test = require('tape')
var path = require('path')

var helper = require('../../helper')
var mm = require('../../helper/mock')
var bootstrap = require('../../bootstrap')

test('shall create child process', t => {
  var target = path.join(helper.paths.fixture, 'noop-app')
  t.plan(5)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
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

      mm.proxyFunction(app, 'onExit', {
        after: function () {
          t.looseEqual(scheduler.appStatus[appId], 'exited')
        }
      })
      scheduler.suspendApp(appId)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('app exits on start up', t => {
  var target = path.join(helper.paths.fixture, 'crash-on-startup-app')
  t.plan(5)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
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

test('trying start app while app is suspending', t => {
  var target = path.join(helper.paths.fixture, 'noop-app')
  t.plan(7)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
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
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      var promise = scheduler.suspendApp(appId)
      t.strictEqual(scheduler.appStatus[appId], 'suspending')
      return promise
    })
    .then(() => {
      return scheduler.createApp(appId)
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

test('suspending dead looping app', t => {
  var target = path.join(helper.paths.fixture, 'malicious-app')
  t.plan(7)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
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
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      scheduler.appMap[appId].emit('activity', 'url', [require('url').parse('yoda-app://foo/loop')])
    })
    .then(() => {
      var promise = scheduler.suspendApp(appId)
      t.strictEqual(scheduler.appStatus[appId], 'suspending')
      return promise
    })
    .then(() => {
      t.looseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'exited')
    })
    .then(() => t.end())
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('suspending SIGTERM trapping app', t => {
  var target = path.join(helper.paths.fixture, 'malicious-app')
  t.plan(11)
  var appId = '@test'
  var tt = bootstrap()
  mm.mockReturns(tt.runtime, 'appDidExit')
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
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      scheduler.appMap[appId].emit('activity', 'url', [require('url').parse('yoda-app://foo/trap')])
    })
    .then(() => {
      var promise = scheduler.suspendApp(appId)
      t.strictEqual(scheduler.appStatus[appId], 'suspending')
      return promise
        .catch(err => {
          t.strictEqual(err.message, 'Suspend app(@test) timed out')
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
    .then(() => t.end())
    .catch(err => {
      t.error(err)
      t.end()
    })
})
