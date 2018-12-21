'use strict'

var test = require('tape')
var upload = require('@yoda/datacollection')

test('array check', (t) => {
  upload({
    eventId: 'datacollection-test',
    eventName: 'datacollection-test',
    eventType:1
  })
  t.end()
})

test('success', (t) => {
  upload([{
    eventId: 'datacollection-test',
    eventName: 'datacollection-test',
    eventType:1
  }])
  t.end()
})

