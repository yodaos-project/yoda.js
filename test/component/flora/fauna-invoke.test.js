var test = require('tape')
var bootstrap = require('./bootstrap')
var mm = require('../../helper/mock')

test('should reject unknown sender', t => {
  t.plan(2)
  var suite = bootstrap()
  suite.floraCall('yodaos.fauna.invoke', [JSON.stringify({
    namespace: 'foo',
    method: 'bar',
    params: [ { foo: 'bar' } ]
  })], { pid: 123 })
    .then(res => {
      t.strictEqual(res.code, 403)
      t.strictEqual(res.msg[0], 'yodaos.fauna.invoke should be called within app process.')
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
  suite.floraCall('yodaos.fauna.invoke', [JSON.stringify({
    namespace: 'foo',
    method: 'bar',
    params: [ { foo: 'bar' } ]
  })], { pid: undefined })
    .then(res => {
      t.strictEqual(res.code, 403)
      t.strictEqual(res.msg[0], `yodaos.fauna.invoke doesn't support been called over network.`)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should invoke method of descriptors', t => {
  t.plan(5)
  var suite = bootstrap()
  var appId = 'test'
  var pid = 123
  var bridge = suite.mockApp(appId, pid)
  mm.mockPromise(bridge, 'invoke', (namespace, method, args) => {
    t.strictEqual(namespace, 'foo')
    t.strictEqual(method, 'bar')
    t.deepEqual(args, [ { foo: 'bar' } ])
    return Promise.resolve({
      foo: 'bar'
    })
  })
  suite.floraCall('yodaos.fauna.invoke', [JSON.stringify({
    namespace: 'foo',
    method: 'bar',
    params: [ { foo: 'bar' } ]
  })], { pid: pid })
    .then(res => {
      t.strictEqual(res.code, 0)
      t.deepEqual(JSON.parse(res.msg[0]), {
        action: 'resolve',
        result: {
          foo: 'bar'
        }
      })
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should reject invocation on error', t => {
  t.plan(2)
  var suite = bootstrap()
  var appId = 'test'
  var pid = 123
  var bridge = suite.mockApp(appId, pid)
  mm.mockPromise(bridge, 'invoke', (namespace, method, args) => {
    var err = new Error('foobar')
    err.code = 'ENOENT'
    return Promise.reject(err)
  })
  suite.floraCall('yodaos.fauna.invoke', [JSON.stringify({
    namespace: 'foo',
    method: 'bar',
    params: [ { foo: 'bar' } ]
  })], { pid: pid })
    .then(res => {
      t.strictEqual(res.code, 0)
      t.deepEqual(JSON.parse(res.msg[0]), {
        action: 'reject',
        error: {
          name: 'Error',
          message: 'foobar',
          code: 'ENOENT'
        }
      })
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
