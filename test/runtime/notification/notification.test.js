var test = require('tape')
var helper = require('../../helper')
var mock = require('../../helper/mock')

var AppRuntime = require(`${helper.paths.runtime}/lib/app-runtime`)

var getFakeRuntime = () => ({
  component: {
    appLoader: {
      notifications: {
        'foo': [ 'a', 'b', 'c' ]
      }
    },
    lifetime: {
      activeSlots: {
        toArray: () => []
      },
      createApp: () => Promise.resolve(),
      destroyAppById: () => Promise.resolve(),
      onLifeCycle: () => Promise.resolve()
    },
    appScheduler: {
      isAppRunning: () => false
    }
  },
  dispatchNotification: AppRuntime.prototype.dispatchNotification
})

test('should dispatch notifications to all apps', t => {
  t.plan(8)
  var runtime = getFakeRuntime()
  var createdApps = []
  mock.mockPromise(runtime.component.lifetime, 'createApp', appId => {
    createdApps.push(appId)
    if (createdApps.length === 3) {
      t.deepEqual(createdApps, ['a', 'b', 'c'])
    }
  })
  var notifiedApps = []
  mock.mockPromise(runtime.component.lifetime, 'onLifeCycle', (appId, event, params) => {
    t.strictEqual(event, 'notification')
    t.deepEqual(params, [ 'foo', 1, 'a', { foo: 'bar' } ])
    notifiedApps.push(appId)
    if (notifiedApps.length === 3) {
      t.deepEqual(notifiedApps, ['a', 'b', 'c'])
    }
  })
  runtime.dispatchNotification('foo', [ 1, 'a', { foo: 'bar' } ], { filterOption: 'all' })
})

test('should dispatch notifications to running apps', t => {
  t.plan(5)
  var runtime = getFakeRuntime()
  mock.mockReturns(runtime.component.appScheduler, 'isAppRunning', appId => appId !== 'a')
  mock.mockPromise(runtime.component.lifetime, 'createApp', () => {
    t.fail('no app should be created')
  })
  var notifiedApps = []
  mock.mockPromise(runtime.component.lifetime, 'onLifeCycle', (appId, event, params) => {
    t.strictEqual(event, 'notification')
    t.deepEqual(params, [ 'foo', 1, 'a', { foo: 'bar' } ])
    notifiedApps.push(appId)
    if (notifiedApps.length === 2) {
      t.deepEqual(notifiedApps, ['b', 'c'])
    }
  })
  runtime.dispatchNotification('foo', [ 1, 'a', { foo: 'bar' } ], { filterOption: 'running' })
})

test('should dispatch notifications to active apps', t => {
  t.plan(3)
  var runtime = getFakeRuntime()
  mock.mockReturns(runtime.component.lifetime.activeSlots, 'toArray', () => [ 'c' ])
  mock.mockReturns(runtime.component.appScheduler, 'isAppRunning', appId => appId !== 'a')
  mock.mockPromise(runtime.component.lifetime, 'createApp', () => {
    t.fail('no app should be created')
  })
  var notifiedApps = []
  mock.mockPromise(runtime.component.lifetime, 'onLifeCycle', (appId, event, params) => {
    t.strictEqual(event, 'notification')
    t.deepEqual(params, [ 'foo', 1, 'a', { foo: 'bar' } ])
    notifiedApps.push(appId)
    if (notifiedApps.length === 1) {
      t.deepEqual(notifiedApps, ['c'])
    }
  })
  runtime.dispatchNotification('foo', [ 1, 'a', { foo: 'bar' } ], { filterOption: 'active' })
})
