'use strict'

var test = require('tape')
var AppRuntime = require('../helper/mock-runtime')
var helper = require('../helper')
var Sound = require(`${helper.paths.runtime}/component/sound`)

test('sounds isMuted check', function (t) {
  var runtime = new AppRuntime()
  var sound = new Sound(runtime)
  sound.isMuted()
  t.end()
})

test('sounds set check', function (t) {
  var runtime = new AppRuntime()
  var sound = new Sound(runtime)

  var v = sound.getVolume()
  t.ok(v !== undefined && typeof v === 'number' && v >= 0 && v <= 100, 'get volume')

  sound.setVolume(10)
  v = sound.getVolume()
  t.ok(v === 10, 'set volume 10')

  sound.setVolume(110)
  v = sound.getVolume()
  t.ok(v === 100, 'set volume 110')

  sound.setVolume(-10)
  v = sound.getVolume()
  t.ok(v === 0, 'set volume -10')

  t.end()
})
