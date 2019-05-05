'use strict'

var test = require('tape')

var bootstrap = require('../bootstrap')
var mm = require('../../helper/mock')

test('should go to phase ready', t => {
  var ready = false
  var tt = bootstrap()
  var bridge = tt.getBridge({ appId: 'test' })
  mm.mockPromise(tt.runtime, 'phaseToReady', () => {
    ready = true
  })
  bridge.invoke('runtime', 'setPhase', ['ready'])
    .then(() => {
      t.equal(ready, true)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should go to phase reset', t => {
  var ready = true
  var tt = bootstrap()
  var bridge = tt.getBridge({ appId: 'test' })
  mm.mockPromise(tt.runtime, 'phaseToReset', () => {
    ready = false
  })
  bridge.invoke('runtime', 'setPhase', ['reset'])
    .then(() => {
      t.equal(ready, false)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
