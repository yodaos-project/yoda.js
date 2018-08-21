'use strict'

var test = require('tape')
var light = require('light')

test('light get profile', function (t) {
  var profile = light.getProfile()
  t.equal(typeof profile.leds, 'number')
  t.equal(typeof profile.format, 'number')
  t.equal(typeof profile.maximumFps, 'number')
  t.equal(typeof profile.micAngle, 'number')
  t.end()
})

test('light simple render', function (t) {
  var profile = light.getProfile()
  light.enable()

  var buf = Buffer.from(profile.leds * profile.format)
  buf.fill(233)
  light.write(buf)
  setTimeout(() => {
    buf.fill(0)
    light.write(buf)
    t.end()
  }, 1500)
})
