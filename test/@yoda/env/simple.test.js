'use strict'

var it = require('tape')
var env = require('@yoda/env')

it('should load the test environment', (t) => {
  var config = env.load('test')
  t.equal(config.speechUri, 'wss://apigwws-dev.open.rokid.com:443/api')
  t.end()
})