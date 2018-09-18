var test = require('tape')
var EventEmitter = require('events')

var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')

var helper = require('../../helper')
var Keyboard = require(`${helper.paths.runtime}/lib/component/keyboard`)

test('shall interpret descriptor: openUrl', t => {
  t.plan(2)
  var runtime = new AppRuntime()
  var keyboard = new Keyboard(runtime)

  keyboard.input = new EventEmitter()
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

  runtime.destruct()
})

test('shall interpret descriptor: runtimeMethod', t => {
  t.plan(2)
  var runtime = new AppRuntime()
  var keyboard = new Keyboard(runtime)

  keyboard.input = new EventEmitter()
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

  runtime.destruct()
})

test('shall not interpret malformed descriptor: openUrl - url', t => {
  t.plan(1)
  var runtime = new EventEmitter()
  var keyboard = new Keyboard(runtime)

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
  var runtime = new EventEmitter()
  var keyboard = new Keyboard(runtime)

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
  var runtime = new EventEmitter()
  var keyboard = new Keyboard(runtime)

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
  var runtime = new EventEmitter()
  var keyboard = new Keyboard(runtime)

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

test('longpress: repetitive longpress', t => {
  t.plan(3)
  var runtime = new AppRuntime()
  var keyboard = new Keyboard(runtime)

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

  keyboard.input.emit('keydown', { keyCode: 233 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1500 })

  runtime.destruct()
})

test('longpress: non-repetitive longpress', t => {
  t.plan(1)
  var runtime = new AppRuntime()
  var keyboard = new Keyboard(runtime)

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

  keyboard.input.emit('keydown', { keyCode: 233 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 2000 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 2500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 3000 })

  runtime.destruct()
})

test('longpress: prevent subsequent keyup event', t => {
  t.plan(1)
  var runtime = new AppRuntime()
  var keyboard = new Keyboard(runtime)

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      keyup: {
        runtimeMethod: 'foobar'
      },
      longpress: {
        repeat: false,
        preventSubsequent: true,
        runtimeMethod: 'foobar'
      }
    }
  }

  runtime.foobar = function () {
    t.pass('invoked')
  }

  keyboard.input.emit('keydown', { keyCode: 233 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 500 })
  keyboard.input.emit('longpress', { keyCode: 233, keyTime: 1000 })
  keyboard.input.emit('keyup', { keyCode: 233 })

  runtime.destruct()
})
