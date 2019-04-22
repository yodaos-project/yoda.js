var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('init should be work when setSpeaking is running', t => {
  setTimeout(() => {
    light.init()
    t.end()
  }, 5000)
})
