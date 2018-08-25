'use strict'

var test = require('tape')
var compose = require('@yoda/util').compose

test('should pass through result', t => {
  t.plan(2)
  compose([
    cb => cb(null, 123),
    (cb, res) => cb(null, res)
  ], (err, res) => {
    t.error(err)
    t.strictEqual(res, 123)
    t.end()
  })
})

test('should pass through error', t => {
  t.plan(2)
  compose([
    cb => cb(new Error('foobar')),
    cb => t.fail('unreachable path')
  ], (err, res) => {
    t.assert(err != null)
    t.strictEqual(err.message, 'foobar')
    t.end()
  })
})

test('should break', t => {
  t.plan(2)
  compose([
    cb => compose.Break(123),
    cb => t.fail('unreachable path')
  ], (err, res) => {
    t.error(err)
    t.strictEqual(res, 123)
    t.end()
  })
})
