var test = require('tape')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var Battery = require(`${helper.paths.runtime}/lib/component/battery`)

var getRuntime = () => ({
  component: {
    lifetime: {
      getCurrentAppId: () => undefined
    },
    turen: {
      pickup: () => undefined
    }
  },
  hasBeenDisabled: () => false,
  openUrl: () => Promise.resolve()
})

function sendInfo (battery, data) {
  var ret = Object.assign({
    batSupported: true,
    batChargingOnline: false
  }, data)
  var str = JSON.stringify(ret)
  battery.handleFloraInfo([str])
  return ret
}

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

test('should announce low power on wake up', t => {
  var runtime = getRuntime()
  var battery = new Battery(runtime)
  mock.mockReturns(runtime.component.lifetime, 'getCurrentAppId', '123')

  function partialRestore () {
    runtime.openUrl = () => Promise.resolve()
  }

  Promise.resolve()
    .then(() => {
      sendInfo(battery, { batLevel: 21 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not delegate wake up if battery is above 20')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if battery is above 20'))
    })
    .then(() => {
      partialRestore()
      sendInfo(battery, { batLevel: 20 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.strictEqual(url, 'yoda-skill://battery/low_power_20?is_play=true')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if battery is lower than 20'))
    })
    .then(() => {
      partialRestore()
      sendInfo(battery, { batLevel: 18 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.fail('should not delegate wake up if already delegated in current interval')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, false, 'should not delegate wake up if already delegated in current interval'))
    })
    .then(() => {
      partialRestore()
      sendInfo(battery, { batLevel: 10 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.strictEqual(url, 'yoda-skill://battery/low_power_10?is_play=true')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if battery is lower than 10'))
    })
    .then(() => {
      partialRestore()
      sendInfo(battery, { batLevel: 8 })
      mock.mockPromise(runtime, 'openUrl', (url) => {
        t.strictEqual(url, 'yoda-skill://battery/low_power_8?is_play=true')
      })
      return Promise.resolve(battery.delegateWakeUpIfBatteryInsufficient())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if battery is lower than 8'))
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
        t.strictEqual(url, 'yoda-skill://battery/temperature_0')
      })
      return Promise.resolve(battery.delegateWakeUpIfDangerousStatus())
        .then((it) => t.strictEqual(it, true, 'should delegate wake up if temperature is low'))
    })
    .then(() => {
      sendInfo(battery, { batTemp: 30 })
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should not announce dangerous temperature on wake up within 10 minutes', t => {
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
        t.strictEqual(url, 'yoda-skill://battery/temperature_55')
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
      sendInfo(battery, { batTemp: 30 })
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
