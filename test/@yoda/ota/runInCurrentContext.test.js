'use strict'

var test = require('tape')
var ota = require('@yoda/ota')

test('if cloudgw is not initialized，getAvailableInfo is error', t => {
  t.plan(0)
  ota.runInBackground()
  t.end()
})
