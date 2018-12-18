var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('setGlobalAlphaFactor success', t => {
  light.setGlobalAlphaFactor(10)
  light.setGlobalAlphaFactor(-10)
  light.setGlobalAlphaFactor(1)
  light.setGlobalAlphaFactor(0.5)
  light.setGlobalAlphaFactor(0.1)
  t.end()
})
