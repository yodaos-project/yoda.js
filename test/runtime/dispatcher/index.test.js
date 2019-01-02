var test = require('tape')

var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')

test('should validate config', t => {
  t.plan(1)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher
  t.throws(() => {
    dispatcher.validateConfig([])
  }, 'Invalid component-config.json')
})

test('should throw on unknown component', t => {
  t.plan(1)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher
  t.throws(() => {
    dispatcher.validateConfig({
      interception: {
        'foobar.unknownMethod': []
      }
    })
  }, 'Unknown component(foobar) on component-config')
})

test('should dispatch delegation', t => {
  t.plan(3)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher

  runtime.component.foobar = {
    fn: (arg) => {
      t.strictEqual(arg, 123)
      t.pass()
      return { foo: 'bar' }
    }
  }
  dispatcher.config = {
    interception: {
      'foobar.fn': [ { component: 'foobar', method: 'fn' } ]
    }
  }
  var ret = dispatcher.delegate('foobar.fn', [ 123 ])
  t.deepEqual(ret, { foo: 'bar' })
})

test('should throwing delegation shall be skipped', t => {
  t.plan(1)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher

  runtime.component.foobar = {
    fn: (arg) => {
      throw new Error('foo')
    }
  }
  dispatcher.config = {
    interception: {
      'foobar.fn': [ { component: 'foobar', method: 'fn' } ]
    }
  }
  var ret = dispatcher.delegate('foobar.fn', [ 123 ])
  t.strictEqual(ret, false)
})
