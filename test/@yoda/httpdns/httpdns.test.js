'use strict'

var test = require('tape')
var httpdns = require('@yoda/httpdns')

test('Tape Resolve Ips Form Gslb', (t) => {
  /* start recolve ips form gslb */
  httpdns.syncService('123234', '21asd123124', 2, (error) => {
    t.true(error, 'resolveByGslb implement end')
    var ip = httpdns.resolve('apigwrest.open.rokid.com')
    var ipAil = '101.37.129.131'
    var ipHuawei = '119.3.1.49'

    t.true((ip === ipAil || ip === ipHuawei), 'resolve apigwrest.open.rokid.com')
    t.end()
  })
})
