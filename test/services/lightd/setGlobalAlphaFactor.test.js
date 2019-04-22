var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()

test('setGlobalAlphaFactor success', t => {
  effect.setGlobalAlphaFactor(10)
  effect.setGlobalAlphaFactor(-10)
  effect.setGlobalAlphaFactor(1)
  effect.setGlobalAlphaFactor(0.5)
  effect.setGlobalAlphaFactor(0.1)
  t.end()
})
