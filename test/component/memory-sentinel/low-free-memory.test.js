var test = require('tape')
var mm = require('../../helper/mock')
var bootstrap = require('../../bootstrap')

function setupWaterMark (memorySentinel) {
  memorySentinel.warningDeviceLWM = 10 * 1024
  memorySentinel.fatalDeviceLWM = 8 * 1024
}

function setupApp (memorySentinel, pid, appId, mem) {
  memorySentinel.memMemo = memorySentinel.memMemo || {}
  memorySentinel.memMemo[pid] = mem || 6 * 1024
  memorySentinel.appScheduler.pidAppIdMap[pid] = appId
}

test('find victim: should exclude current key and visible app', t => {
  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  var pid = 123
  var appId = 'test'
  setupWaterMark(memorySentinel)
  setupApp(memorySentinel, pid, appId)

  mm.mockReturns(suite.component.visibility, 'getKeyAndVisibleAppId', appId)
  var victim = memorySentinel.findVictim()
  t.ok(victim == null)
  t.end()
})

test('find victim: app idled for a long time', t => {
  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  setupWaterMark(memorySentinel)
  setupApp(memorySentinel, 123, 'test', 6 * 1000)
  setupApp(memorySentinel, 456, 'test-2', 12 * 1000)
  var now = Date.now()
  mm.mockReturns(Date, 'now', now)
  mm.mockReturns(suite.component.appScheduler, 'getAppStat', (appId) => {
    switch (appId) {
      case 'test': {
        return { idleAt: Date.now() - 10 * 60 * 1000 }
      }
      case 'test-2': {
        return { idleAt: Date.now() }
      }
    }
  })

  var victim = memorySentinel.findVictim()
  t.deepEqual(victim, { pid: '123', mem: 6 * 1000, factor: 12 * 1000 })
  t.end()
  mm.restore()
})

test('low water mark: should send broadcast and suspend app', t => {
  t.plan(4)
  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  setupWaterMark(memorySentinel)
  setupApp(memorySentinel, 123, 'test', 6 * 1000)

  mm.mockPromise(memorySentinel, 'getAvailableMemory', null, 11 * 1024)
  mm.mockPromise(suite.component.broadcast, 'dispatch', () => {
    t.fail('unreachable path')
  })
  mm.mockPromise(suite.component.appScheduler, 'suspendApp', () => {
    t.fail('unreachable path')
  })
  memorySentinel.compelFreeAvailableMemory()
    .then(() => {
      mm.mockPromise(memorySentinel, 'getAvailableMemory', null, 9 * 1024)
      mm.mockPromise(suite.component.broadcast, 'dispatch', (channel) => {
        t.strictEqual(channel, 'yodaos.memory-sentinel.low-memory-warning')
      })

      return memorySentinel.compelFreeAvailableMemory()
    })
    .then(() => {
      mm.mockPromise(memorySentinel, 'getAvailableMemory', null, 7 * 1024)
      mm.mockPromise(suite.component.broadcast, 'dispatch', (channel) => {
        t.strictEqual(channel, 'yodaos.memory-sentinel.low-memory-warning')
      })
      mm.mockPromise(suite.component.appScheduler, 'suspendApp', (appId, options) => {
        t.strictEqual(appId, 'test')
        t.deepEqual(options, { force: true })
      })
      return memorySentinel.compelFreeAvailableMemory()
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
