'use strict'

var prop = require('@yoda/property')
var keys = require('../probe.json')

function stub (name) {
  var key = keys[name]
  if (key) {
    prop.set(key, Date.now())
  }
}
exports.stub = stub
