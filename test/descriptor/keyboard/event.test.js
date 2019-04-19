'use strict'

var test = require('tape')
var _ = require('@yoda/util')._

var bootstrap = require('../bootstrap')

test('should register interests on prevent defaults', t => {
  var tt = bootstrap()
  var bridge = tt.getBridge({ appId: 'test' })
  bridge.invoke('keyboard', 'preventDefaults', [ 123, 'click' ])
    .then(() => {
      t.strictEqual(_.get(tt.runtime.component, `keyboard.interests.${bridge.appId}.click:123`), true)
      return bridge.invoke('keyboard', 'restoreDefaults', [ 123, 'click' ])
    })
    .then(() => {
      t.looseEqual(_.get(tt.runtime.component, `keyboard.interests.${bridge.appId}.click:123`), null)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should register all interests on prevent defaults with no event specified', t => {
  var tt = bootstrap()
  var bridge = tt.getBridge({ appId: 'test' })
  var events = ['keydown', 'keyup', 'click', 'dbclick', 'longpress']
  bridge.invoke('keyboard', 'preventDefaults', [ 123 ])
    .then(() => {
      events.forEach(it => {
        t.strictEqual(_.get(tt.runtime.component, `keyboard.interests.${bridge.appId}.${it}:123`), true)
      })
      return bridge.invoke('keyboard', 'restoreDefaults', [ 123 ])
    })
    .then(() => {
      events.forEach(it => {
        t.looseEqual(_.get(tt.runtime.component, `keyboard.interests.${bridge.appId}.${it}:123`), null)
      })
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should unregister all interests on restore all', t => {
  var tt = bootstrap()
  var bridge = tt.getBridge({ appId: 'test' })
  var events = ['keydown', 'keyup', 'click', 'dbclick', 'longpress']
  bridge.invoke('keyboard', 'preventDefaults', [ 123 ])
    .then(() => {
      events.forEach(it => {
        t.strictEqual(_.get(tt.runtime.component, `keyboard.interests.${bridge.appId}.${it}:123`), true)
      })
      return bridge.invoke('keyboard', 'restoreAll', [])
    })
    .then(() => {
      t.looseEqual(_.get(tt.runtime.component, `keyboard.interests.${bridge.appId}`), null)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should transfer events', t => {
  var tt = bootstrap()
  var bridge = tt.getBridge({ appId: 'test' })
  var events = ['keydown', 'keyup', 'click', 'dbclick', 'longpress']

  t.plan(events.length)
  events.forEach(it => {
    bridge.subscribe('keyboard', it, function (event) {
      t.strictEqual(event.keyCode, 123)
    })
  })

  events.forEach(it => {
    tt.runtime.component.keyboard.handleAppListener(it, { keyCode: 123 })
  })
  bridge.invoke('keyboard', 'preventDefaults', [ 123 ])
    .then(() => {
      events.forEach(it => {
        tt.runtime.component.keyboard.handleAppListener(it, { keyCode: 123 })
      })
      return bridge.invoke('keyboard', 'restoreAll', [ 123 ])
    })
    .then(() => {
      events.forEach(it => {
        tt.runtime.component.keyboard.handleAppListener(it, { keyCode: 123 })
      })
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
