var test = require('tape')
var mock = require('../../helper/mock')
var otaNetwork = require('@yoda/ota/network')

function mockFetchInfo (data) {
  mock.restore()
  mock.mockCallback(otaNetwork, 'fetchOtaInfo', null, data)
}

var condition = require('@yoda/ota/condition')
var battery = require('@yoda/battery')
var manifest = require('@yoda/manifest')

test('ota shall be available if fetched info is same with pending update', t => {
  t.plan(1)
  mockFetchInfo({ version: '1' })
  mock.mockReturns(manifest, 'isCapabilityEnabled', false)
  condition.getAvailabilityOfOta({ version: '1' })
    .then(available => {
      t.strictEqual(available, true)
    })
})

test('ota shall be available if battery is charging', t => {
  t.plan(1)
  mockFetchInfo({ version: '1' })
  mock.mockReturns(manifest, 'isCapabilityEnabled', true)
  mock.mockPromise(battery, 'getBatteryInfo', null, {
    batSupported: true,
    batChargingOnline: true,
    batLevel: 49
  })
  condition.getAvailabilityOfOta({ version: '1' })
    .then(available => {
      t.strictEqual(available, true)
    })
})

test('ota shall be available if battery is not charging yet power level is sufficient', t => {
  t.plan(1)
  mockFetchInfo({ version: '1' })
  mock.mockReturns(manifest, 'isCapabilityEnabled', true)
  mock.mockPromise(battery, 'getBatteryInfo', null, {
    batSupported: true,
    batChargingOnline: false,
    batLevel: 51
  })
  condition.getAvailabilityOfOta({ version: '1' })
    .then(available => {
      t.strictEqual(available, true)
    })
})

test('ota shall not be available if no update info could be fetched', t => {
  t.plan(1)
  mockFetchInfo({ version: '1' })
  condition.getAvailabilityOfOta({})
    .then(available => {
      t.strictEqual(available, 'new_version')
    })
})

test('ota shall not be available if fetched update info is not equal to pending update', t => {
  t.plan(1)
  mockFetchInfo({ version: '2' })
  condition.getAvailabilityOfOta({ version: '1' })
    .then(available => {
      t.strictEqual(available, 'new_version')
    })
})

test('ota shall not be available if battery is low power level and not charging', t => {
  t.plan(1)
  mockFetchInfo({ version: '1' })
  mock.mockReturns(manifest, 'isCapabilityEnabled', true)
  mock.mockPromise(battery, 'getBatteryInfo', null, {
    batSupported: true,
    batChargingOnline: false,
    batLevel: 49
  })
  condition.getAvailabilityOfOta({ version: '1' })
    .then(available => {
      t.strictEqual(available, 'low_power')
    })
})

test('ota shall not be available if battery is extremely low power level', t => {
  t.plan(1)
  mockFetchInfo({ version: '1' })
  mock.mockReturns(manifest, 'isCapabilityEnabled', true)
  mock.mockPromise(battery, 'getBatteryInfo', null, {
    batSupported: true,
    batChargingOnline: true,
    batLevel: 14
  })
  condition.getAvailabilityOfOta({ version: '1' })
    .then(available => {
      t.strictEqual(available, 'extremely_low_power')
    })
})
