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
  app.keyboard.interests = { click: { 233: true } }
  runtime.component.appScheduler.getAppById = function (appId) {
    if (appId === '@test/simple-app') {
      return app
    }
  }
  runtime.component.lifetime.getCurrentAppId = function () {
    return '@test/simple-app'
  }

  keyboard.input = new EventEmitter()
  keyboard.listen()

  app.keyboard.on('click', event => {
    t.strictEqual(event.keyCode, 233)
    later()
  })
  app.keyboard.on('dbclick', () => {
    t.fail('shall not receive un-listened events')
  })

  keyboard.input.emit('click', { keyCode: 233 })
  keyboard.input.emit('dbclick', { keyCode: 233 })

  function later () {
    delete app.keyboard.interests.click[233]
    keyboard.input.emit('click', { keyCode: 233 })
    runtime.deinit()
  }
})
