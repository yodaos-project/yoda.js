var test = require('tape')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var bootstrap = require('../../bootstrap')
var AppBridge = require(`${helper.paths.runtime}/app/app-bridge`)

function createMockApp (runtime, appId) {
  var app = new AppBridge(runtime)

  var component = runtime.component
  component.appScheduler.appMap[appId] = app
  component.appScheduler.appStatus[appId] = 'running'
  component.appScheduler.appLaunchOptions[appId] = {}
  return app
}

test('should dispatch app event', t => {
  t.plan(3)
  var tt = bootstrap()
  var runtime = tt.runtime
  var dispatcher = tt.component.dispatcher

  mock.mockReturns(runtime, 'hasBeenDisabled', false)

  var args = [ { foo: 'bar' }, 'foobar' ]
  var app = createMockApp(runtime, 'foobar')
  app.subscribe(null, 'test-event', function () {
    t.deepEqual(Array.prototype.slice.call(arguments), args)
  })

  var ret = dispatcher.dispatchAppEvent('foobar', 'test-event', args)
  t.true(ret instanceof Promise)

  ret.then(dispatched => {
    t.deepEqual(dispatched, true)
  }).catch(err => {
    t.error(err)
    t.end()
  })
})

test('should not dispatch app event if runtime has been disabled', t => {
  t.plan(1)
  var tt = bootstrap()
  var runtime = tt.runtime
  var dispatcher = runtime.component.dispatcher

  runtime.disableRuntimeFor('test')

  var args = [ { foo: 'bar' }, 'foobar' ]
  var app = createMockApp(runtime, 'foobar')
  app.subscribe(null, 'test-event', function () {
    t.fail('unreachable path')
  })

  dispatcher.dispatchAppEvent('foobar', 'test-event', args)
    .then(dispatched => {
      t.deepEqual(dispatched, false)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
