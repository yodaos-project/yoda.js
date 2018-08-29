'use strict'

var test = require('tape')
var path = require('path')
var lightApp = require('/usr/lib/yoda/runtime/lib/app/lightAppProxy')
var proxy = require('../fixture/light-app').proxy

var target = path.join(__dirname, '..', 'fixture', 'light-app')
test('should receive life cycle events', t => {
  t.plan(6)
  proxy.on('created', () => {
    t.pass('event `created` received')
  })
  proxy.on('paused', () => {
    t.pass('event `paused` received')
  })
  proxy.on('resumed', () => {
    t.pass('event `resumed` received')
  })
  proxy.on('destroyed', () => {
    t.pass('event `destroyed` received')
  })

  var nlp = { intent: { } }
  var action = { appId: '@test' }
  proxy.on('onrequest', (gotNlp, gotAction) => {
    t.strictEqual(gotNlp, nlp, 'nlp comparison')
    t.strictEqual(gotAction, action, 'action comparison')
  })
  var createApp = lightApp(target)
  var app = createApp('@test', {})
  app.emit('created')
  app.emit('paused')
  app.emit('resumed')
  app.emit('destroyed')
  app.emit('onrequest', nlp, action)
})
