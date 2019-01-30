var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('setHide should be ok', t => {
  setTimeout(() => {
    light.setHide()
    t.end()
  }, 5000)
})
