var test = require('tape')
var time = require('@yoda/util').time

test('toString: check if translation is correct', t => {
  var str = time.toString(56, 34, 12)
  t.equal(str, '12小时34分钟56秒')
  t.end()
})

test('toString: check if translation is correct in "en-us"', t => {
  var str = time.toString(56, 34, 12, 0, 'en-us')
  t.equal(str, '12 hours and 34 minutes and 56 seconds')
  t.end()
})

test('toString: check if 0d0h0m0s is correct', t => {
  var str = time.toString()
  t.equal(str, '0秒')
  t.end()
})

test('toSeconds: check if calculation is correct', t => {
  var secs = time.toSeconds(56, 34, 12)
  t.equal(secs, 45296)
  t.end()
})

test('toSeconds: check if 0d0h0m0s is correct', t => {
  var secs = time.toSeconds()
  t.equal(secs, 0)
  t.end()
})
