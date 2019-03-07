var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var mock = require('../../helper/mock')
var Battery = require(`${helper.paths.runtime}/lib/component/battery`)
var batHelper = require('./helper')

var getRuntime = batHelper.getRuntime
var sendInfo = batHelper.sendInfo

test('should parse battery.info', t => {
  t.plan(1)
  var runtime = getRuntime()
  var battery = new Battery(runtime)
  var expected = sendInfo(battery, { batLevel: 60 })
  t.deepEqual(battery.memoInfo, expected)
})

test('should skip malformed battery.info', t => {
  t.plan(1)
  var runtime = getRuntime()
  var battery = new Battery(runtime)
  battery.handleFloraInfo('foobar')
  t.looseEqual(battery.memoInfo, null)
})

test('announce low power while idling', t => {
  var runtime = getRuntime()
  var battery = new Battery(runtime)
  mock.mockReturns(runtime.component.lifetime, 'getCurrentAppId', null)

  function partialRestore () {
    runtime.openUrl = () => Promise.resolve()
  }

  Promise.resolve()
    .then(() => {
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not open url on bat level change if battery is above 20 while idling')
      })
      sendInfo(battery, { batLevel: 21 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not delegate wake up if battery is above 20')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if battery is above 20'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not open url on bat level change if battery is lower than 20 while idling')
      })
      sendInfo(battery, { batLevel: 20 })
      mock.mockPromise(runtime, 'openUrl', (url, options) => {
        t.strictEqual(url, 'yoda-skill://battery/low_power_20?is_play=false')
        t.strictEqual(!!_.get(options, 'preemptive', true), true)
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if battery is lower than 20'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not open url on bat level change if battery is lower than 20 while idling')
      })
      sendInfo(battery, { batLevel: 18 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not delegate wake up if already delegated in current interval')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if already delegated in current interval'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not open url on bat level change if battery is lower than 10 while idling')
      })
      sendInfo(battery, { batLevel: 10 })
      mock.mockPromise(runtime, 'openUrl', (url, options) => {
        t.strictEqual(url, 'yoda-skill://battery/low_power_10?is_play=false')
        t.strictEqual(!!_.get(options, 'preemptive', true), true)
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if battery is lower than 10 and idling'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url, options) => {
        t.strictEqual(url, 'yoda-skill://battery/low_power_8?is_play=false')
        t.strictEqual(!!_.get(options, 'preemptive', true), false)
      })
      sendInfo(battery, { batLevel: 8 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not open url on wake up if battery is lower than 8 while idling')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if battery is lower than 8'))
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('announce low power while not idling', t => {
  var runtime = getRuntime()
  var battery = new Battery(runtime)
  mock.mockReturns(runtime.component.lifetime, 'getCurrentAppId', 'foobar')

  function partialRestore () {
    runtime.openUrl = () => Promise.resolve()
  }

  Promise.resolve()
    .then(() => {
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not open url if battery is above 20')
      })
      sendInfo(battery, { batLevel: 21 })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if battery is above 20'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not open url if battery is lower than 20')
      })
      sendInfo(battery, { batLevel: 20 })
      mock.mockPromise(runtime, 'openUrl', (url, options) => {
        t.strictEqual(url, 'yoda-skill://battery/low_power_20?is_play=true')
        t.strictEqual(!!_.get(options, 'preemptive', true), true)
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if battery is lower than 20'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not delegate wake up if already delegated in current interval')
      })
      sendInfo(battery, { batLevel: 18 })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if already delegated in current interval'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url, options) => {
        t.strictEqual(url, 'yoda-skill://battery/low_power_10?is_play=true')
        t.strictEqual(!!_.get(options, 'preemptive', true), true)
      })
      sendInfo(battery, { batLevel: 10 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not open url on wake up if battery is lower than 10 while not idling')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if battery is lower than 10 and not idling'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url, options) => {
        t.strictEqual(url, 'yoda-skill://battery/low_power_8?is_play=true')
        t.strictEqual(!!_.get(options, 'preemptive', true), false)
      })
      sendInfo(battery, { batLevel: 8 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not open url if battery is lower than 8 while not idling')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if battery is lower than 8'))
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not announce low power repeatedly on same interval', t => {
  var runtime = getRuntime()
  var battery = new Battery(runtime)

  function partialRestore () {
    runtime.openUrl = () => Promise.resolve()
  }

  Promise.resolve()
    .then(() => {
      partialRestore()
      sendInfo(battery, { batLevel: 20 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail()
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if announced on idle'))
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should handle dangerous temperature on battery.info', t => {
  t.plan(5)
  mock.restore()
  var runtime = getRuntime()
  var battery = new Battery(runtime)
  t.strictEqual(battery.dangerousState, 'normal')
  sendInfo(battery, { batTemp: 55 })
  t.strictEqual(battery.dangerousState, 'high')

  sendInfo(battery, { batTemp: 54 })
  t.strictEqual(battery.dangerousState, 'normal')

  sendInfo(battery, { batTemp: 0 })
  t.strictEqual(battery.dangerousState, 'low')

  sendInfo(battery, { batTemp: 1 })
  t.strictEqual(battery.dangerousState, 'normal')
})

test('should announce dangerous temperature on wake up', t => {
  t.plan(10)
  var runtime = getRuntime()
  var battery = new Battery(runtime)
  var tenMinutes = 10 * 60 * 1000
  var times = 0
  mock.mockReturns(Date, 'now', () => {
    ++times
    return times * tenMinutes
  })

  function partialRestore () {
    runtime.openUrl = () => Promise.resolve()
  }

  Promise.resolve()
    .then(() => {
      partialRestore()
      sendInfo(battery, { batTemp: 54 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail()
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if temperature is normal'))
    })
    .then(() => {
      partialRestore()
      sendInfo(battery, { batTemp: 55 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.strictEqual(url, 'yoda-skill://battery/temperature_55')
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if temperature is high'))
    })
    .then(() => {
      partialRestore()
      sendInfo(battery, { batTemp: 56 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.strictEqual(url, 'yoda-skill://battery/temperature_55')
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if temperature is high'))
    })
    .then(() => {
      partialRestore()
      sendInfo(battery, { batTemp: 54 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail()
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if temperature is normal'))
    })
    .then(() => {
      partialRestore()
      sendInfo(battery, { batTemp: 0 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.strictEqual(url, 'yoda-skill://battery/temperature_0')
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if temperature is low'))
    })
    .then(() => {
      partialRestore()
      sendInfo(battery, { batTemp: -1 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.strictEqual(url, 'yoda-skill://battery/temperature_0', 'opened low temperature url')
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if temperature is low'))
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not announce dangerous temperature on wake up within 10 minutes', t => {
  t.plan(5)
  var runtime = getRuntime()
  var battery = new Battery(runtime)
  var tenMinutes = 10 * 60 * 1000
  var times = 1
  mock.mockReturns(Date, 'now', () => {
    times = times * 1.5
    return times * tenMinutes
  })

  function partialRestore () {
    runtime.openUrl = () => Promise.resolve()
  }

  Promise.resolve()
    .then(() => {
      partialRestore()
      sendInfo(battery, { batTemp: 55 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.strictEqual(url, 'yoda-skill://battery/temperature_55')
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if temperature is high'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not delegate wake up in ten minutes')
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up in ten minutes'))
    })
    .then(() => {
      partialRestore()
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.strictEqual(url, 'yoda-skill://battery/temperature_55')
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up after ten minutes'))
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
