'use strict'

var test = require('tape')
var createInput = require('@yoda/input')

var inputEvent = createInput() // init

test('type check', function (t) {
  t.equal(typeof inputEvent, 'object')
  t.end()
})

// id:1302
test('input should listen and stop', (t) => {
  inputEvent.on('keyup', (event) => {
    console.log('keyup', event.keyCode)
  })

  inputEvent.on('keydown', (event) => {
    console.log('keydown', event.keyCode)
  })

  setTimeout(() => {
    inputEvent.disconnect()
    t.end()
  }, 500) // 5000
})
