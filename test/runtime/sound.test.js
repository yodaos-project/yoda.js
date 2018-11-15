'use strict'

var test = require('tape')
var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')
var helper = require('../helper')
var Sound = require(`${helper.paths.runtime}/lib/component/sound`)

test('sounds check', function (t) {
  var runtime = new AppRuntime()
  var sound = new Sound(runtime)
  sound.isMuted()
  t.end()
})
