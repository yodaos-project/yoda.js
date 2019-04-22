var test = require('tape')

var util = require('util')
var ota = require('@yoda/ota')
var mockedOta = {}
function otaMock (name) {
  return function () {
    if (mockedOta[name] == null) {
      throw new Error(`${name} should be mocked`)
    }
    return mockedOta[name].apply(this, arguments)
  }
}
ota.getInfoIfFirstUpgradedBoot[util.promisify.custom] = otaMock('getInfoIfFirstUpgradedBoot')
ota.getInfoOfPendingUpgrade[util.promisify.custom] = otaMock('getInfoOfPendingUpgrade')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var OtaComponent = require(`${helper.paths.runtime}/lib/component/ota`)
var mockRuntime = require('./mock').mockRuntime

test('should delegate runtimeDidLogin if first upgraded boot info is available', t => {
  mock.restore()
  t.plan(2)
  var fakeRuntime = mockRuntime()
  var otaComp = new OtaComponent(fakeRuntime)

  mock.mockPromise(mockedOta, 'getInfoIfFirstUpgradedBoot', null, { changelog: 'foobar' })
  mock.mockPromise(fakeRuntime, 'openUrl', (url) => {
    t.strictEqual(url, 'yoda-skill://ota/on_first_boot_after_upgrade?changelog=foobar')
  })

  Promise.resolve(otaComp.runtimeDidLogin())
    .then(delegation => {
      t.strictEqual(delegation, true)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not delegate runtimeDidLogin if first upgraded boot info is available', t => {
  mock.restore()
  t.plan(1)
  var fakeRuntime = mockRuntime()
  var otaComp = new OtaComponent(fakeRuntime)

  mock.mockPromise(mockedOta, 'getInfoIfFirstUpgradedBoot', null, null)
  mock.mockPromise(fakeRuntime, 'openUrl', (url) => {
    t.fail('unreachable path')
  })

  Promise.resolve(otaComp.runtimeDidLogin())
    .then(delegation => {
      t.strictEqual(delegation, false)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not delegate turenDidWakeUp if in late night', t => {
  mock.restore()
  t.plan(1)
  var fakeRuntime = mockRuntime()
  var otaComp = new OtaComponent(fakeRuntime)
  otaComp.forceUpdateAvailable = true

  mock.mockReturns(Date.prototype, 'getHours', 22)

  Promise.resolve(otaComp.turenDidWakeUp())
    .then(delegation => {
      t.strictEqual(delegation, false)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not delegate turenDidWakeUp if no pending update info found', t => {
  mock.restore()
  t.plan(1)
  var fakeRuntime = mockRuntime()
  var otaComp = new OtaComponent(fakeRuntime)
  otaComp.forceUpdateAvailable = true

  mock.mockReturns(Date.prototype, 'getHours', 21)
  mock.mockPromise(mockedOta, 'getInfoOfPendingUpgrade', null, null)

  Promise.resolve(otaComp.turenDidWakeUp())
    .then(delegation => {
      t.strictEqual(delegation, false)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not delegate turenDidWakeUp if ota is not available', t => {
  mock.restore()
  t.plan(1)
  var fakeRuntime = mockRuntime()
  var otaComp = new OtaComponent(fakeRuntime)
  otaComp.forceUpdateAvailable = true

  mock.mockReturns(Date.prototype, 'getHours', 21)
  mock.mockPromise(mockedOta, 'getInfoOfPendingUpgrade', null, {})
  mock.mockPromise(ota.condition, 'getAvailabilityOfOta', null, 'new_version')

  Promise.resolve(otaComp.turenDidWakeUp())
    .then(delegation => {
      t.strictEqual(delegation, false)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should delegate turenDidWakeUp if ota is available', t => {
  mock.restore()
  t.plan(6)
  var fakeRuntime = mockRuntime()
  var otaComp = new OtaComponent(fakeRuntime)
  otaComp.forceUpdateAvailable = true

  mock.mockReturns(Date.prototype, 'getHours', 21)
  mock.mockPromise(mockedOta, 'getInfoOfPendingUpgrade', null, { imagePath: '/data/upgrade/imagePath' })
  mock.mockPromise(ota.condition, 'getAvailabilityOfOta', null, true)

  mock.mockReturns(fakeRuntime, 'setMicMute', (mute, options) => {
    t.strictEqual(mute, true)
    t.deepEqual(options, { silent: true })
  })
  mock.mockReturns(fakeRuntime, 'setPickup', pickup => {
    t.strictEqual(pickup, false)
  })
  mock.mockPromise(fakeRuntime, 'openUrl', url => {
    t.strictEqual(url, 'yoda-skill://ota/force_upgrade?image_path=%2Fdata%2Fupgrade%2FimagePath')
  })
  mock.mockReturns(fakeRuntime, 'startMonologue', appId => {
    t.strictEqual(appId, '@yoda/ota')
  })

  Promise.resolve(otaComp.turenDidWakeUp())
    .then(delegation => {
      t.strictEqual(delegation, true)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not delegate turenDidWakeUp if lifetime is been monopolized', t => {
  mock.restore()
  t.plan(1)
  var fakeRuntime = mockRuntime()
  var otaComp = new OtaComponent(fakeRuntime)
  otaComp.forceUpdateAvailable = true

  mock.mockReturns(fakeRuntime.component.lifetime, 'isMonopolized', true)

  Promise.resolve(otaComp.turenDidWakeUp())
    .then(delegation => {
      t.strictEqual(delegation, false)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
