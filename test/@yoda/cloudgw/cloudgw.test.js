'use strict'

var test = require('tape')
var Cloudgw = require('@yoda/cloudgw')
var logger = require('logger')('cloudgw')
// var config = require('../../helper/config').cloudgw
var config = {
  'deviceId': 'XXX',
  'deviceTypeId': 'XXX',
  'key': 'XXX',
  'secret': 'XXX'
}

test('useful data', (t) => {
  var otaEndpoint = '/v1/extended/ota/check'
  var localVersion = '1.0.7-20180901-071701'
  var cloudgw = new Cloudgw(config)

  if (cloudgw == null) {
    logger.error('cloudgw is not initialized.')
    return
  }

  cloudgw.request(otaEndpoint,
    { version: localVersion },
    { service: 'ota' },
    function onResponse (err, body) {
      if (err) {
        // logger.log(err)
        t.equal(typeof body, 'undefined', 'the body should be undefined')
      } else {
        t.equal(typeof body, 'object', 'the body should be object')
        // logger.log(body)
      }

      t.notEqual(body, null, 'the body is not null')
      t.notEqual(body, {}, 'the body is not {}')
    })

  t.end()
})
