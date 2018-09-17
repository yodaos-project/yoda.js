'use strict'

var test = require('tape')
var light = require('@yoda/light')

test('light should disable if enable before.', t =>{
  t.plan(2)
  light.enable()
  light.fill(111,34,88,1)
  t.ok(light.write())
  setTimeout(() => {
    light.disable()
    light.fill(255,255,255,1)
    t.throws(()=>{light.write()},new RegExp('light value write error'),'light value write error')
    t.end()
  }, 1500)
})

test('light should disable,if disable already', t =>{
  t.plan(2)
  light.disable()
  light.fill(255,255,255,1)
  t.throws(()=>{light.write()},new RegExp('light value write error'),'light value write error')
  setTimeout(() => {
    light.disable()
    light.fill(255,255,255,1)
    t.throws(()=>{light.write()},new RegExp('light value write error'),'light value write error')
    t.end()
  }, 1500)
})
