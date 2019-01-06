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

test('should dispatch delegation', t => {
  t.plan(4)
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
      'foobarFn': [ { component: 'foobar', method: 'fn' } ]
    }
  }
  var ret = dispatcher.delegate('foobarFn', [ 123 ])
  t.true(ret instanceof Promise)

  ret.then(delegation => {
    t.deepEqual(delegation, { foo: 'bar' })
  }).catch(err => {
    t.error(err)
    t.end()
  })
})

test('should skip delegation if no component has interests', t => {
  t.plan(4)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher

  runtime.component.foobar = {
    fn: (arg) => {
      t.strictEqual(arg, 123)
      t.pass()
      return false
    }
  }
  dispatcher.config = {
    interception: {
      'foobarFn': [ { component: 'foobar', method: 'fn' } ]
    }
  }
  var ret = dispatcher.delegate('foobarFn', [ 123 ])
  t.true(ret instanceof Promise)

  ret.then(delegation => {
    t.deepEqual(delegation, false)
  }).catch(err => {
    t.error(err)
    t.end()
  })
})

test('not existing delegation shall be skipped', t => {
  t.plan(1)
  var runtime = new AppRuntime()
  var dispatcher = runtime.component.dispatcher

  runtime.component.foobar = {}
  dispatcher.config = {
    interception: {
      'foobarFn': [ { component: 'foobar', method: 'fn' } ]
    }
  }
  dispatcher.delegate('foobarFn', [ 123 ])
    .then(ret => {
      t.strictEqual(ret, false)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('throwing delegation shall be skipped', t => {
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
      'foobarFn': [ { component: 'foobar', method: 'fn' } ]
    }
  }
  dispatcher.delegate('foobarFn', [ 123 ])
    .then(ret => {
      t.strictEqual(ret, false)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
