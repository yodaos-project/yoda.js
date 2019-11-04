'use strict'

var logger = require('logger')('perf')
var prop = require('@yoda/property')
var keys = require('../probe.json')
var lastStub = {
  name: null,
  timestamp: 0
}

function stub (name) {
  var key = keys[name]
  if (key) {
    var timestamp = Math.floor(Date.now())
    prop.set(key, timestamp)
    logger.info(`stub<${name}> it consumes ${timestamp - lastStub.timestamp}ms`)
    lastStub.name = name
    lastStub.timestamp = timestamp
  }
}
exports.stub = stub
