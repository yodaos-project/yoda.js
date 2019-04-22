var LightRenderingContextManager = require('/usr/yoda/services/lightd/effects')
var test = require('tape')
var light = require('@yoda/light')
var effect = new LightRenderingContextManager()
var profile = light.getProfile()
var leds = profile.leds

test('pixel should be work', t => {
  var context = effect.getContext()
  context._getCurrentId = function () {
    return 0
  }
  for (var i = 0; i <= 100; i++) {
    context.clear()
    context.pixel(i % leds, 0, 255, 0, 1)
    context.render()
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
