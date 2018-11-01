'use strict'

var test = require('tape')
var light = require('@yoda/light')

test('if light enable,write ok', t => {
  light.fill(255, 255, 255, 1)
  t.ok(light.write())
  t.end()
})
