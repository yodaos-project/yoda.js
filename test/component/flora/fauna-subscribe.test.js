var test = require('tape')
var bootstrap = require('./bootstrap')
var mm = require('../../helper/mock')

test('should reject unknown sender', t => {
  t.plan(2)
  var suite = bootstrap()
  suite.floraCall('yodaos.fauna.subscribe', [JSON.stringify({
    namespace: 'foo',
    event: 'bar'
  })], { pid: 123 })
    .then(res => {
      t.strictEqual(res.code, 403)
      t.strictEqual(res.msg[0], 'yodaos.fauna.subscribe should be called within app process.')
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should reject no-pid sender', t => {
  t.plan(2)
  var suite = bootstrap()
  suite.floraCall('yodaos.fauna.subscribe', [JSON.stringify({
    namespace: 'foo',
    event: 'bar'
  })], { pid: undefined })
    .then(res => {
      t.strictEqual(res.code, 403)
      t.strictEqual(res.msg[0], `yodaos.fauna.subscribe doesn't support been called over network.`)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should subscribe events', t => {
  t.plan(6)
  var suite = bootstrap()
  var appId = 'test'
  var pid = 123
  var bridge = suite.mockApp(appId, pid)

  mm.proxyFunction(bridge, 'subscribe', {
    before: function (self, args) {
      t.strictEqual(args[0], 'foo')
      t.strictEqual(args[1], 'bar')
    }
  })
  mm.mockPromise(suite.component.flora, 'call', (name, msg, target) => {
    t.strictEqual(name, 'yodaos.fauna.harbor')
    t.deepEqual(msg, [ 'event', JSON.stringify({
      namespace: 'foo',
      event: 'bar',
      params: [ { foo: 'bar' }, 'second' ]
    }) ])
    t.strictEqual(target, `${appId}:${pid}`)
  })
  suite.floraCall('yodaos.fauna.subscribe', [JSON.stringify({
    namespace: 'foo',
    event: 'bar'
  })], { pid: pid })
    .then(res => {
      t.strictEqual(res.code, 0)
      bridge.emit('foo', 'bar', [ { foo: 'bar' }, 'second' ])
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
