var test = require('tape')
var mm = require('../../helper/mock')
var bootstrap = require('../../bootstrap')

function setupWaterMark (memorySentinel) {
  memorySentinel.backgroundAppHWM = 8 * 1024
  memorySentinel.visibleAppHWM = 10 * 1024
}

function setupApp (memorySentinel, pid, appId, mem) {
  memorySentinel.memMemo = memorySentinel.memMemo || {}
  memorySentinel.memMemo[pid] = mem || 6 * 1024
  memorySentinel.appScheduler.pidAppIdMap[pid] = appId
}

function readjustMem (memorySentinel, pid, mem) {
  memorySentinel.memMemo = memorySentinel.memMemo || {}
  memorySentinel.memMemo[pid] = mem || 6 * 1024
}

test('high water mark: should apply background app water mark if app is not visible', t => {
  t.plan(2)

  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  var pid = 123
  setupWaterMark(memorySentinel)
  setupApp(memorySentinel, pid, 'test')

  mm.mockPromise(suite.component.appScheduler, 'suspendApp', (appId, options) => {
    t.fail('unreachable path')
  })
  memorySentinel.compelHighWaterMark()
    .then(() => {
      readjustMem(memorySentinel, pid, 9 * 1024)

      mm.mockPromise(suite.component.appScheduler, 'suspendApp', (appId, options) => {
        t.strictEqual(appId, 'test')
        t.deepEqual(options, { force: true })
      })
      return memorySentinel.compelHighWaterMark()
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('high water mark: should apply visible app water mark if app is visible', t => {
  t.plan(2)

  var suite = bootstrap()
  var memorySentinel = suite.component.memorySentinel
  var pid = 123
  var appId = 'test'
  setupWaterMark(memorySentinel)
  setupApp(memorySentinel, pid, appId)

  mm.mockReturns(suite.component.visibility, 'getVisibleAppIds', [ appId ])
  mm.mockPromise(suite.component.appScheduler, 'suspendApp', () => {
    t.fail('unreachable path')
  })
  memorySentinel.compelHighWaterMark()
    .then(() => {
      readjustMem(memorySentinel, pid, 9 * 1024)

      return memorySentinel.compelHighWaterMark()
    })
    .then(() => {
      readjustMem(memorySentinel, pid, 11 * 1024)

      mm.mockPromise(suite.component.appScheduler, 'suspendApp', (actualAppId, options) => {
        t.strictEqual(actualAppId, appId)
        t.deepEqual(options, { force: true })
      })
      return memorySentinel.compelHighWaterMark()
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
