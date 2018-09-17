'use strict'

var test = require('tape')
var light = require('@yoda/light')

test('if light disable,write error', t => {
  t.plan(1)
  light.disable()
  light.fill(255,255,255,1)
  t.throws(()=>{light.write()},new RegExp('light value write error'),'light value write error')
  t.end()
})

test('if light enable,write ok', t => {
  t.plan(1)
  light.enable()
  light.fill(255,255,255,1)
  t.ok(light.write())
  t.end()
})



