'use strict'

var it = require('tape')
var json = require('@yoda/util').json

it('should parse invalid json', t => {
  var ret = json.safeParse('foobar')
  t.equal(ret, undefined)
  t.end()
})
