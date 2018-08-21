'use strict'

var test = require('tape')
var ota = require('@yoda/ota')
var path = require('path')

test('should calculate file hash', t => {
  t.plan(2)
  var file = path.join(__dirname, '..', '..', 'fixture', 'calc-hash.txt')
  ota.calculateFileHash(file, (err, hash) => {
    t.error(err)
    t.strictEqual(hash, '0085c0086e6c7786a35a5bbd058e8353')
    t.end()
  })
})
