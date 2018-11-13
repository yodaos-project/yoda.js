var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('render setPickup light success', t => {
  light.setPickup()
  setTimeout(() => {
    light.stopPrev(true)
    t.end()
  }, 5000)
})
