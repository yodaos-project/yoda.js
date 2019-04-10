'use strict'

var test = require('tape')

var bootstrap = require('../bootstrap')
var mm = require('../../helper/mock')

test('should invoke runtime.exitAppById', t => {
  t.plan(2)

  var tt = bootstrap()
  var bridge = tt.getBridge({ appId: 'test' })
  mm.mockPromise(tt.runtime, 'exitAppById', (appId, options) => {
    t.strictEqual(appId, 'test')
    t.deepEqual(options, { ignoreKeptAlive: true })
  })
  bridge.invoke('activity', 'exit', [])
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should invoke runtime.exitAppById with options', t => {
  t.plan(2)

  var tt = bootstrap()
  var bridge = tt.getBridge({ appId: 'test' })
  mm.mockPromise(tt.runtime, 'exitAppById', (appId, options) => {
    t.strictEqual(appId, 'test')
    t.deepEqual(options, { ignoreKeptAlive: true, clearContext: true })
  })
  bridge.invoke('activity', 'exit', [ {clearContext: true} ])
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
