'use strict'

var test = require('tape')
var path = require('path')

var helper = require('../helper')
var mm = require('../helper/mock')
var proxy = require('./fixture/invoke-light/app').proxy
var lightApp = require(`${helper.paths.runtime}/app/light-app`)
var AppBridge = require(`${helper.paths.runtime}/app/app-bridge`)

function getBridge () {
  var runtime = {
    descriptor: {
      activity: {
        ping: function () {
          return 'pong'
        }
      },
      foobar: {
        ping: function () {
          return 'pong'
        }
      }
    }
  }
  return new AppBridge(runtime, 'test-app')
}

var target = path.join(__dirname, 'fixture', 'invoke-light')

test('should listen no events if no listener presents', t => {
  proxy.removeAllListeners()
  var bridge = getBridge()
  lightApp('@test', { appHome: path.join(helper.paths.fixture, 'noop-app') }, bridge, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(bridge => {
      t.strictEqual(Object.keys(bridge.subscriptionTable).length, 0)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should listen events in need', t => {
  proxy.removeAllListeners()
  var bridge = getBridge()
  lightApp('@test', { appHome: target }, bridge, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(() => {
      ;['echo'].forEach(it => {
        t.strictEqual(typeof bridge.subscriptionTable[`activity.${it}`], 'function', `listener of '${it}' shall presents.`)
        t.strictEqual(typeof bridge.subscriptionTable[`foobar.${it}`], 'function', `nested listener shall presents.`)
      })
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should resolve invocations', t => {
  proxy.removeAllListeners()
  var bridge = getBridge()
  lightApp('@test', { appHome: target }, bridge, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(() => {
      proxy.on('invoke', event => {
        t.strictEqual(event.result, 'pong')
        t.end()
      })
      bridge.emit(null, 'echo', [ 'ping' ])
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should reject invocations', t => {
  proxy.removeAllListeners()
  var bridge = getBridge()
  mm.mockPromise(bridge.runtime.descriptor.activity, 'ping', () => {
    throw new Error('foobar')
  })
  lightApp('@test', { appHome: target }, bridge, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(() => {
      proxy.on('invoke', event => {
        t.deepEqual(event.error, { name: 'Error', message: 'foobar' })
        t.end()
      })
      bridge.emit(null, 'echo', [ 'ping' ])
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should trigger event and pass arguments', t => {
  proxy.removeAllListeners()
  var bridge = getBridge()

  var expected = [ { foo: 123, bar: { foo: 'bar' } }, { bar: 'foo' } ]
  lightApp('@test', { appHome: target }, bridge, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(() => {
      proxy.on('event', event => {
        t.deepEqual(event.args, expected)
        t.end()
      })
      bridge.emit('foobar', 'echo', expected)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should invoke methods with expected arguments', t => {
  proxy.removeAllListeners()
  var bridge = getBridge()

  var expected = [ 123, '123', { foo: 'bar' } ]
  mm.mockPromise(bridge.runtime.descriptor.activity, 'ping', function (ctx) {
    t.deepEqual(ctx.args, expected)
    return 'OK'
  })
  lightApp('@test', { appHome: target }, bridge, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(() => {
      proxy.on('invoke', event => {
        t.deepEqual(event.result, 'OK')
        t.end()
      })
      bridge.emit(null, 'echo', [ 'ping', expected ])
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should set app secret', t => {
  proxy.removeAllListeners()
  var bridge = getBridge()

  var appSecret = 'foobar'
  lightApp('@test', { appHome: target, appSecret: appSecret }, bridge, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(() => {
      proxy.on('app-fetch', event => {
        t.deepEqual(event.result, appSecret)
        t.end()
      })
      bridge.emit(null, 'app-fetch', [ 'appSecret' ])
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
