'use strict'

var test = require('tape')
var httpdns = require('@yoda/httpdns')

test('Tape Resolve Ips Form Gslb', (t) => {
  /* start recolve ips form gslb */
  httpdns.syncService('device_sn', 'device_type', 5000, (error) => {
    t.true(error, 'resolveByGslb implement end')
    var ip = httpdns.resolve('apigwrest.open.rokid.com')
    var ip1 = '101.37.129.131'
    var ip2 = '119.3.1.49'

    t.true((ip === ip1 || ip === ip2), 'resolve apigwrest.open.rokid.com')
    t.end()
  })
})
