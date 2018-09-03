'use strict'

var test = require('tape')
var createInput = require('@yoda/input')

test('input should listen and stop', (t) => {
  var input = createInput()
  setTimeout(() => {
    input.disconnect()
    t.end()
  }, 2000)
})
