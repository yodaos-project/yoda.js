'use strict'

var test = require('tape')
var prop = require('property')
var login = require('/usr/lib/yoda/runtime/cloudapi/login')

test('login', function (t) {
  t.plan(4)
  login().then((data) => {
    t.equal(data.device_id, prop.get('ro.boot.serialno'), 'the login device id is checked')
    t.equal(typeof data.device_type_id, 'string', 'the login device type id is checked')
    t.equal(typeof data.key, 'string', 'the login key is checked')
    t.equal(typeof data.secret, 'string', 'the login secret is checked')
    t.end()
  })
})
