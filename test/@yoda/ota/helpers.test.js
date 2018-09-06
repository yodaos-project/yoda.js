'use strict'

var test = require('tape')
var path = require('path')
var ota = require('@yoda/ota')
var helper = require('../../helper')

test('should calculate file hash', t => {
  t.plan(2)
  var file = path.join(helper.paths.fixture, 'calc-hash.txt')
  ota.calculateFileHash(file, (err, hash) => {
    t.error(err)
    t.strictEqual(hash, '9fe0f5901125ace23de80738b720b6ea')
    t.end()
  })
})
