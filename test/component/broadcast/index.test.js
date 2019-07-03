var test = require('tape')
var bootstrap = require('../../bootstrap')
var mm = require('../../helper/mock')

test('should dispatch broadcasts to dynamically registered apps', t => {
  t.plan(3)
  var tt = bootstrap()
  var broadcast = tt.component.broadcast

  mm.mockPromise(tt.component.appScheduler, 'createApp', null, null)
  mm.mockReturns(tt.descriptor.broadcast, 'emitToApp', (appId, name, args) => {
    t.strictEqual(appId, 'test')
    t.strictEqual(name, 'broadcast')
    t.deepEqual(args, [ 'foobar' ])
  })
  broadcast.registerBroadcastChannel('foobar')
  broadcast.registerBroadcastReceiver('foobar', 'test')
  broadcast.dispatch('foobar')
})

test('should not dispatch broadcasts to dynamically registered apps while exited', t => {
  t.plan(1)
  var tt = bootstrap()
  var broadcast = tt.component.broadcast

  mm.mockPromise(tt.component.appScheduler, 'createApp', null, null)
  mm.mockReturns(tt.descriptor.broadcast, 'emitToApp', (appId, name, args) => {
    t.fail('unreachable path')
  })
  broadcast.registerBroadcastChannel('foobar')
  broadcast.registerBroadcastReceiver('foobar', 'test')
  broadcast.appDidExit('test')
  t.strictEqual(broadcast.interests['test'], undefined)

  broadcast.dispatch('foobar')
})

test('should dispatch broadcasts to statically registered apps', t => {
  t.plan(3)
  var tt = bootstrap()
  var broadcast = tt.component.broadcast

  mm.mockPromise(tt.component.appScheduler, 'createApp', null, null)
  mm.mockReturns(tt.descriptor.broadcast, 'emitToApp', (appId, name, args) => {
    t.strictEqual(appId, 'test')
    t.strictEqual(name, 'broadcast')
    t.deepEqual(args, [ 'foobar' ])
  })
  broadcast.registerBroadcastChannel('foobar')
  tt.component.appLoader.broadcasts['foobar'].push('test')
  broadcast.dispatch('foobar')
})

test('should dispatch broadcasts to statically registered apps while exited', t => {
  t.plan(4)
  var tt = bootstrap()
  var broadcast = tt.component.broadcast

  mm.mockPromise(tt.component.appScheduler, 'createApp', null, null)
  mm.mockReturns(tt.descriptor.broadcast, 'emitToApp', (appId, name, args) => {
    t.strictEqual(appId, 'test')
    t.strictEqual(name, 'broadcast')
    t.deepEqual(args, [ 'foobar' ])
  })
  broadcast.registerBroadcastChannel('foobar')
  tt.component.appLoader.broadcasts['foobar'].push('test')

  broadcast.appDidExit('test')
  t.strictEqual(broadcast.interests['test'], undefined)

  broadcast.dispatch('foobar')
})

test('should dispatch broadcasts to apps with params', t => {
  t.plan(3)
  var tt = bootstrap()
  var broadcast = tt.component.broadcast

  mm.mockPromise(tt.component.appScheduler, 'createApp', null, null)
  mm.mockReturns(tt.descriptor.broadcast, 'emitToApp', (appId, name, args) => {
    t.strictEqual(appId, 'test')
    t.strictEqual(name, 'broadcast')
    t.deepEqual(args, [ 'foobar', [ 'arg1', 'arg2' ] ])
  })
  broadcast.registerBroadcastChannel('foobar')
  tt.component.appLoader.broadcasts['foobar'].push('test')

  broadcast.dispatch('foobar', ['arg1', 'arg2'])
})
