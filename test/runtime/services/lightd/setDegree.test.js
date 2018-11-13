var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('render setDegree light success when awake light or not render before', t => {
  setTimeout(() => {
    light.setDegree('@yoda', 90)
    setTimeout(() => {
      light.setAwake('@yoda')
      setTimeout(() => {
        light.setDegree('@yoda', 90)
        t.end()
        setTimeout(() => {
        }, 1000)
      }, 1000)
    }, 1000)
  }, 1000)
})
