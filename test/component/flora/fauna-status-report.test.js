var test = require('tape')
var bootstrap = require('./bootstrap')

test('should reject no-pid sender', t => {
  t.plan(2)
  var suite = bootstrap()
  suite.floraCall('yodaos.fauna.status-report', [ 'ready' ], { pid: undefined })
    .then(res => {
      t.strictEqual(res.code, 403)
      t.strictEqual(res.msg[0], `yodaos.fauna.status-report doesn't support been called over network.`)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should reject unknown sender', t => {
  t.plan(2)
  var suite = bootstrap()
  suite.floraCall('yodaos.fauna.status-report', ['ready'], { pid: 123 })
    .then(res => {
      t.strictEqual(res.code, 403)
      t.strictEqual(res.msg[0], 'yodaos.fauna.status-report should be called within app process.')
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should emit status report', t => {
  t.plan(2)
  var suite = bootstrap()
  var appId = 'test'
  var pid = 123
  var bridge = suite.mockApp(appId, pid, 'creating')

  bridge.onStatusReport = (status) => {
    t.strictEqual(status, 'ready')
  }
  suite.floraCall('yodaos.fauna.status-report', [ 'ready' ], { pid: pid })
    .then(res => {
      t.strictEqual(res.code, 0)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
