var test = require('tape')
var EventEmitter = require('events')

var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')

var helper = require('../../helper')
var Keyboard = require(`${helper.paths.runtime}/lib/component/keyboard`)

test('shall prevent default', t => {
  t.plan(1)
  var runtime = new AppRuntime()
  var keyboard = new Keyboard(runtime)
  var app = new EventEmitter()
  app.keyboard = new EventEmitter()
  runtime.loader.getAppById = function () {
    return app
  }
  runtime.life.getCurrentAppId = function () {
    return '@test/simple-app'
  }

  keyboard.input = new EventEmitter()
  keyboard.listen()

  app.keyboard.on('click', event => {
    t.strictEqual(event.keyCode, 233)
  })
  app.keyboard.on('dbclick', () => {
    t.fail('shall not receive un-listened events')
  })

  keyboard.preventKeyDefaults('@test/simple-app', '233', 'click')
  keyboard.input.emit('click', { keyCode: 233 })
  keyboard.input.emit('dbclick', { keyCode: 233 })
  keyboard.restoreKeyDefaults('@test/simple-app', '233', 'click')
  keyboard.input.emit('click', { keyCode: 233 })

  runtime.destruct()
})

test('shall listen all type events of one key code', t => {
  t.plan(2)
  var runtime = new AppRuntime()
  var keyboard = new Keyboard(runtime)
  var app = new EventEmitter()
  app.keyboard = new EventEmitter()
  runtime.loader.getAppById = function () {
    return app
  }
  runtime.life.getCurrentAppId = function () {
    return '@test/simple-app'
  }

  keyboard.input = new EventEmitter()
  keyboard.listen()

  app.keyboard.on('click', event => {
    t.fail('shall receive events after restored')
  })
  app.keyboard.on('dbclick', event => {
    t.strictEqual(event.keyCode, 233, 'dbclick')
  })
  app.keyboard.on('longpress', event => {
    t.strictEqual(event.keyCode, 233, 'longpress')
  })

  keyboard.preventKeyDefaults('@test/simple-app', '233')
  keyboard.input.emit('dbclick', { keyCode: 233 })
  keyboard.input.emit('keydown', { keyCode: 233, keyTime: 2333 })
  keyboard.input.emit('longpress', { keyCode: 233 })
  keyboard.restoreKeyDefaults('@test/simple-app', '233')
  keyboard.input.emit('click', { keyCode: 233 })

  runtime.destruct()
})
