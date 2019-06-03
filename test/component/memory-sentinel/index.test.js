var test = require('tape')
var bootstrap = require('../../bootstrap')

test('should load device info', t => {
  t.plan(12)

  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  memorySentinel.loadDeviceInfo()
    .then(() => {
      ;['backgroundAppHWM',
        'keyAndVisibleAppHWM',
        'warningDeviceLWM',
        'fatalDeviceLWM'
      ].forEach(it => {
        t.strictEqual(typeof memorySentinel[it], 'number')
        t.ok(Number.isFinite(memorySentinel[it]))
        t.ok(memorySentinel[it] > 0)
      })
      t.end()
    })
})

test('should get process memory usage', t => {
  t.plan(2)

  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  memorySentinel.getProcessMemoryUsage(process.pid)
    .then(mem => {
      t.strictEqual(typeof mem, 'number')
      t.ok(mem > 0)
      t.end()
    })
})

test('should get free memory available', t => {
  t.plan(2)

  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  memorySentinel.getAvailableMemory()
    .then(mem => {
      t.strictEqual(typeof mem, 'number')
      t.ok(mem > 0)
      t.end()
    })
})

test('should get process memory usage', t => {
  t.plan(2)

  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  memorySentinel.getProcessMemoryUsage(process.pid)
    .then(mem => {
      t.strictEqual(typeof mem, 'number')
      t.ok(mem > 0)
      t.end()
    })
})

test('should fail on getting non-existence process memory usage', t => {
  t.plan(2)

  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  memorySentinel.getProcessMemoryUsage(65535)
    .then(mem => {
      t.fail('unreachable path')
      t.end()
    })
    .catch(err => {
      t.ok(err != null)
      t.throws(() => {
        throw err
      }, /^Error: Command failed/)
      t.end()
    })
})

test('should construct apps memory memo', t => {
  t.plan(2)

  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  suite.component.appScheduler.pidAppIdMap[process.pid] = 'test'
  memorySentinel.loadAppMemInfo(65535)
    .then(() => {
      t.deepEqual(Object.keys(memorySentinel.memMemo), [ String(process.pid) ])
      t.ok(typeof memorySentinel.memMemo[process.pid] === 'number')
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
