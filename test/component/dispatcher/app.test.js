var test = require('tape')
var EventEmitter = require('events')

var mock = require('../../helper/mock')
var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')

function createMockApp (runtime, appId) {
  var app = new EventEmitter()
  app.destruct = () => {}

  var component = runtime.component
  component.appScheduler.appMap[appId] = app
  component.appScheduler.appStatus[appId] = 'running'
  component.appScheduler.appLaunchOptions[appId] = {}
  return app
}

test('should dispatch app event', t => {
  t.plan(4)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher

  mock.mockReturns(runtime, 'hasBeenDisabled', false)

  var args = [ { foo: 'bar' }, 'foobar' ]
  var app = createMockApp(runtime, 'foobar')
  app.on('test-event', function () {
    t.deepEqual(Array.prototype.slice.call(arguments), args)
  })

  var ret = dispatcher.dispatchAppEvent('foobar', 'test-event', args)
  t.true(ret instanceof Promise)

  ret.then(dispatched => {
    t.deepEqual(dispatched, true)
    t.strictEqual(runtime.component.lifetime.getCurrentAppId(), 'foobar')
  }).catch(err => {
    t.error(err)
    t.end()
  })
})

test('should not dispatch app event if runtime has been disabled', t => {
  t.plan(2)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher

  runtime.disableRuntimeFor('test')

  var args = [ { foo: 'bar' }, 'foobar' ]
  var app = createMockApp(runtime, 'foobar')
  app.on('test-event', function () {
    t.fail('unreachable path')
  })

  dispatcher.dispatchAppEvent('foobar', 'test-event', args)
    .then(dispatched => {
      t.deepEqual(dispatched, false)
      t.looseEqual(runtime.component.lifetime.getCurrentAppId(), null)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not dispatch preemptive app event if lifetime has been monopolized by a cut app', t => {
  t.plan(3)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher

  mock.mockReturns(runtime, 'hasBeenDisabled', false)

  var args = [ { foo: 'bar' }, 'foobar' ]
  var app = createMockApp(runtime, 'foobar')
  var monopolist = createMockApp(runtime, 'monopolist')
  app.on('test-event', function () {
    t.fail('unreachable path')
  })
  monopolist.on('oppressing', event => {
    t.strictEqual(event, 'test-event')
  })

  runtime.component.lifetime.activateAppById('monopolist')
    .then(() => runtime.startMonologue('monopolist'))
    .then(() => dispatcher.dispatchAppEvent('foobar', 'test-event', args))
    .then(dispatched => {
      t.deepEqual(dispatched, /** event has been handled, prevent tts/media from recovering */true)
      t.strictEqual(runtime.component.lifetime.getCurrentAppId(), 'monopolist')
    }).catch(err => {
      t.error(err)
      t.end()
    })
})

test('should dispatch preemptive cut app event if lifetime has been monopolized by a scene app', t => {
  t.plan(3)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher

  mock.mockReturns(runtime, 'hasBeenDisabled', false)

  createMockApp(runtime, 'monopolist')
  var args = [ { foo: 'bar' }, 'foobar' ]
  var app = createMockApp(runtime, 'foobar')
  app.on('test-event', function () {
    t.deepEqual(Array.prototype.slice.call(arguments), args)
  })

  runtime.component.lifetime.activateAppById('monopolist', 'scene')
    .then(() => runtime.startMonologue('monopolist'))
    .then(() => dispatcher.dispatchAppEvent('foobar', 'test-event', args))
    .then(dispatched => {
      t.deepEqual(dispatched, true)
      t.strictEqual(runtime.component.lifetime.getCurrentAppId(), 'foobar')
    }).catch(err => {
      t.error(err)
      t.end()
    })
})
