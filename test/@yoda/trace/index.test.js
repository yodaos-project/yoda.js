'use strict'

var test = require('tape')
var upload = require('@yoda/trace')

test('trace: array check', (t) => {
  t.throws(() => {
    upload({
      eventId: 'datacollection-test',
      eventName: 'datacollection-test',
      eventType: 1
    })
  }, 'expect an array on traces')
  t.end()
})

test('trace: array length check', (t) => {
  t.throws(() => {
    upload([])
  }, new RegExp('expect traces length greater than 0'), 'expect traces length greater than 0')
  t.end()
})

test('trace: success', (t) => {
  upload([{
    eventId: 'datacollection-test',
    eventName: 'datacollection-test',
    eventType: 1
  }])
  t.end()
})
