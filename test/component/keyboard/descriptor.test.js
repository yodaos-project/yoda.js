var test = require('tape')
var EventEmitter = require('events')

var bootstrap = require('../../bootstrap')

function setUp () {
  var tt = bootstrap()
  var keyboard = tt.component.keyboard

  keyboard.input = new EventEmitter()
  keyboard.input.disconnect = function noop () {}

  return { runtime: tt.runtime, keyboard: keyboard }
}

test('shall interpret descriptor: openUrl', t => {
  t.plan(2)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.listen()

  keyboard.config = {
    '233': {
      click: {
        url: 'foobar://example.com',
        options: {
          preemptive: false
        }
      }
    }
  }

  runtime.openUrl = function (url, options) {
    t.strictEqual(url, 'foobar://example.com')
    t.deepEqual(options, {
      preemptive: false
    })
    return Promise.resolve()
  }

  keyboard.input.emit('click', { keyCode: 233 })
})

test('shall interpret descriptor: runtimeMethod', t => {
  t.plan(2)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.listen()

  keyboard.config = {
    '233': {
      click: {
        runtimeMethod: 'foobar',
        params: [
          'foobar://example.com',
          { preemptive: false }
        ]
      }
    }
  }

  runtime.foobar = function (args1, args2) {
    t.strictEqual(args1, 'foobar://example.com')
    t.deepEqual(args2, {
      preemptive: false
    })
  }

  keyboard.input.emit('click', { keyCode: 233 })
})

test('shall interpret descriptor: componentMethod', t => {
  t.plan(2)
  var tt = setUp()
  var keyboard = tt.keyboard

  keyboard.listen()

  keyboard.config = {
    '233': {
      click: {
        componentMethod: 'keyboard.foobar',
        params: [
          'foobar://example.com',
          { preemptive: false }
        ]
      }
    }
  }

  keyboard.foobar = function (args1, args2) {
    t.strictEqual(args1, 'foobar://example.com')
    t.deepEqual(args2, {
      preemptive: false
    })
  }

  keyboard.input.emit('click', { keyCode: 233 })
})

test('shall not interpret malformed descriptor: openUrl - url', t => {
  t.plan(1)
  var tt = setUp()
  var keyboard = tt.keyboard

  try {
    keyboard.execute({
      url: 2333,
      options: {
        preemptive: false
      }
    })
    t.pass('no error')
  } catch (err) {
    t.error(err)
  }
})

test('shall not interpret malformed descriptor: openUrl - options', t => {
  t.plan(1)
  var tt = setUp()
  var keyboard = tt.keyboard

  try {
    keyboard.execute({
      url: 'foobar://foobar',
      options: 23333
    })
    t.pass('no error')
  } catch (err) {
    t.error(err)
  }
})

test('shall not interpret malformed descriptor: not exists runtimeMethod', t => {
  t.plan(1)
  var tt = setUp()
  var keyboard = tt.keyboard

  try {
    keyboard.execute({
      runtimeMethod: 'foobar'
    })
    t.pass('no error')
  } catch (err) {
    t.error(err)
  }
})

test('shall not interpret malformed descriptor: non-array runtimeMethod params', t => {
  t.plan(1)
  var tt = setUp()
  var keyboard = tt.keyboard

  try {
    keyboard.execute({
      runtimeMethod: 'on',
      params: 2333
    })
    t.pass('no error')
  } catch (err) {
    t.error(err)
  }
})

test('gesture: fallbacks', t => {
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    fallbacks: {
      click: {
        runtimeMethod: 'foobar',
        params: [ 'click' ]
      },
      dbclick: {
        runtimeMethod: 'foobar',
        params: [ 'dbclick' ]
      }
    }
  }

  var expectedEvents = ['click', 'dbclick']

  runtime.foobar = function (event) {
    var idx = expectedEvents.indexOf(event)
    if (idx >= 0) {
      expectedEvents.splice(idx, 1)
      t.pass(`invoked ${event}`)
    }
    if (expectedEvents.length === 0) {
      t.end()
    }
  }

  keyboard.input.emit('click', { keyCode: 233 })
  keyboard.input.emit('dbclick', { keyCode: 233 })
})

test('gesture: override fallbacks', t => {
  t.plan(1)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    fallbacks: {
      click: {
        runtimeMethod: 'foobar',
        params: [ 'click' ]
      }
    },
    '233': {
      click: {
        runtimeMethod: 'onClick',
        params: [ 'click' ]
      }
    }
  }

  runtime.foobar = function () {
    t.fail('fallback shall not be invoked.')
  }

  runtime.onClick = function onClick () {
    t.pass('clicked')
  }

  keyboard.input.emit('click', { keyCode: 233 })
})

test('keyup: keyup should always fire regardless of not matching keyCode', t => {
  t.plan(1)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      keyup: {
        runtimeMethod: 'foobar'
      }
    }
  }

  runtime.foobar = function () {
    t.pass('invoked')
  }

  keyboard.input.emit('keydown', { keyCode: 233, keyTime: 0 })
  keyboard.input.emit('keydown', { keyCode: 244, keyTime: 0 })
  keyboard.input.emit('keyup', { keyCode: 233, keyTime: 500 })
})

test('longpress: repetitive longpress', t => {
  t.plan(3)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      longpress: {
        repeat: true,
        runtimeMethod: 'foobar'
      }
    }
  }

  runtime.foobar = function () {
    t.pass('invoked')
  }

  keyboard.input.emit('keydown', { keyCode: 233, keyTime: 0 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1500 })
})

test('longpress: round longpress timeDelta', t => {
  t.plan(3)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      longpress: {
        repeat: true,
        runtimeMethod: 'foobar'
      }
    }
  }

  runtime.foobar = function () {
    t.pass('invoked')
  }

  keyboard.input.emit('keydown', { keyCode: 233, keyTime: 0 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 499 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1001 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1256 })
})

test('longpress: non-repetitive longpress', t => {
  t.plan(1)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      longpress: {
        repeat: false,
        timeDelta: 2000,
        runtimeMethod: 'foobar'
      }
    }
  }

  runtime.foobar = function () {
    t.pass('invoked')
  }

  keyboard.input.emit('keydown', { keyCode: 233, keyTime: 0 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 2000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 2500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 3000 })
})

test('longpress: prevent subsequent keyup event', t => {
  t.plan(1)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      keyup: {
        runtimeMethod: 'foobar'
      },
      longpress: {
        repeat: false,
        timeDelta: 500,
        preventSubsequent: true,
        runtimeMethod: 'foobar'
      }
    }
  }

  runtime.foobar = function () {
    t.pass('invoked')
  }

  keyboard.input.emit('keydown', { keyCode: 233, keyTime: 0 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1000 })
  keyboard.input.emit('keyup', { keyCode: 233 })
})

test('longpress: multiple endpoints for time delta', t => {
  t.plan(2)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      'longpress-2000': {
        repeat: false,
        timeDelta: 2000,
        preventSubsequent: false,
        runtimeMethod: 'foobar'
      },
      'longpress-5000': {
        repeat: false,
        timeDelta: 5000,
        preventSubsequent: true,
        runtimeMethod: 'foobar'
      }
    }
  }

  runtime.foobar = function () {
    t.pass('invoked')
  }

  keyboard.input.emit('keydown', { keyCode: 233, keyTime: 2000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 4000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 7000 })
  keyboard.input.emit('keyup', { keyCode: 233 })
})

test('longpress: multiple endpoints for time delta on interrupting another keydown-keyup', t => {
  t.plan(2)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      'longpress-2000': {
        repeat: false,
        timeDelta: 2000,
        preventSubsequent: false,
        runtimeMethod: 'foobar'
      },
      'longpress-5000': {
        repeat: false,
        timeDelta: 5000,
        preventSubsequent: true,
        runtimeMethod: 'foobar'
      }
    }
  }

  runtime.foobar = function () {
    t.pass('invoked')
  }

  keyboard.input.emit('keydown', { keyCode: 222, keyTime: 0 })
  keyboard.input.emit('keydown', { keyCode: 233, keyTime: 2000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 4000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 7000 })
  keyboard.input.emit('keyup', { keyCode: 233 })
})

test('longpress: interrupted with a new key code', t => {
  t.plan(2)
  var tt = setUp()
  var keyboard = tt.keyboard
  var runtime = tt.runtime

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      longpress: {
        repeat: true,
        runtimeMethod: 'foobar'
      }
    },
    '244': {
      longpress: {
        timeDelta: 1000,
        runtimeMethod: 'foobar'
      }
    }
  }

  runtime.foobar = function () {
    t.pass('invoked')
  }

  keyboard.input.emit('keydown', { keyCode: 233, keyTime: 0 })
  /** 1. */
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 500 })

  keyboard.input.emit('keydown', { keyCode: 244, keyTime: 0 })
  /** keyCode should not match */
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1000 })

  /** longpress criteria should not match */
  keyboard.input.emit('longpress', { keyCode: 244, keyTime: 500 })

  keyboard.input.emit('keyup', { keyCode: 233, keyTime: 1500 })
  /** 2. while previous key keyup during second key long pressing */
  keyboard.input.emit('longpress', { keyCode: 244, keyTime: 1000 })
})
