var test = require('tape')

var helper = require('../../helper')
var Battery = require(`${helper.paths.runtime}/component/battery`)
var batHelper = require('./helper')
var bootstrap = require('../../bootstrap')

var sendInfo = batHelper.sendInfo

test('isCharging should be false if memoInfo not present', t => {
  t.plan(1)
  var tt = bootstrap()
  var battery = new Battery(tt.runtime)
  t.deepEqual(battery.isCharging(), false)
})

test('isCharging should be false if battery not supported', t => {
  t.plan(1)
  var tt = bootstrap()
  var battery = new Battery(tt.runtime)
  sendInfo(battery, { batSupported: false })
  t.deepEqual(battery.isCharging(), false)
})

test('isCharging should be false if batChargingOnline not truethy', t => {
  t.plan(1)
  var tt = bootstrap()
  var battery = new Battery(tt.runtime)
  sendInfo(battery, { batChargingOnline: false })
  t.deepEqual(battery.isCharging(), false)
})

test('isCharging should be true if batChargingOnline is truthy', t => {
  t.plan(1)
  var tt = bootstrap()
  var battery = new Battery(tt.runtime)
  sendInfo(battery, { batChargingOnline: true })
  t.deepEqual(battery.isCharging(), true)
})
