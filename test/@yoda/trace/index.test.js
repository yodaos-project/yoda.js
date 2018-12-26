'use strict'

var test = require('tape')
var upload = require('@yoda/trace')

test('array check', (t) => {
  t.throws(() => {
    upload({
      eventId: 'datacollection-test',
      eventName: 'datacollection-test',
      eventType: 1
    })
  }, new RegExp('Expect a object Array on traces'), 'expect traces is a object array')
  t.end()
})

test('array length check', (t) => {
  t.throws(() => {
    upload([])
  }, new RegExp('Expect traces length greater than 0'), 'expect traces length greater than 0')
  t.end()
})

test('success', (t) => {
  upload([{
    eventId: 'datacollection-test',
    eventName: 'datacollection-test',
    eventType: 1
  }])
  t.end()
})
