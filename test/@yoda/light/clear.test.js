'use strict'

var test = require('tape')
var light = require('@yoda/light')
var profile = light.getProfile()
var leds = profile.leds
test('if have shadow it works', t => {
  t.ok(light.clear())
  for (var i = 0; i <= 10; i++) {
    light.clear()
    light.pixel(i % leds, 0, 255, 0, 1, true)
    light.write()
    sleep(50)
  }
  t.end()
})

function sleep (numberMillis) {
  var now = new Date()
  var exitTime = now.getTime() + numberMillis
  while (true) {
    now = new Date()
    if (now.getTime() > exitTime) { return }
  }
}
