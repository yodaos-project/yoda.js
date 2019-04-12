'use strict'

var test = require('tape')
var path = require('path')

var helper = require('../helper')
var mm = require('../helper/mock')
var AppBridge = require(`${helper.paths.runtime}/app/app-bridge`)
var extApp = require(`${helper.paths.runtime}/app/ext-app`)

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

test('create ext-app: appHome is a not existing path', t => {
  var appHome = path.join(helper.paths.fixture, 'foobar-definitely-not-exists')
  extApp('@test/ipc-test', { appHome: appHome }, getBridge(), /* mode */0, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(bridge => {
      t.fail('appHome is err path')
    }, err => {
      t.ok(err !== null)
      t.end()
    })
})

test('should listen no events if no listener presents', t => {
  var target = path.join(helper.paths.fixture, 'noop-app')

  extApp('@test', { appHome: target }, getBridge(), /* mode */0, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(bridge => {
      t.strictEqual(Object.keys(bridge.subscriptionTable).length, 0)
      bridge.suspend()
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should listen events in need', t => {
  var target = path.join(__dirname, 'fixture', 'invoke')

  extApp('@test', { appHome: target }, getBridge(), /* mode */0, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(bridge => {
      ;['echo'].forEach(it => {
        t.strictEqual(typeof bridge.subscriptionTable[`activity.${it}`], 'function', `listener of '${it}' shall presents.`)
        t.strictEqual(typeof bridge.subscriptionTable[`foobar.${it}`], 'function', `nested listener shall presents.`)
      })
      bridge.suspend()
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should resolve invocation', t => {
  var target = path.join(__dirname, 'fixture', 'invoke')
  extApp('@test', { appHome: target }, getBridge(), /* mode */0, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(bridge => {
      bridge.emit(null, 'echo', [ 'ping' ])
      bridge.childProcess.on('message', message => {
        if (message.type !== 'test' && message.event !== 'invoke') {
          return
        }
        t.strictEqual(message.result, 'pong')
        bridge.suspend()
        t.end()
      })
    }, err => {
      t.error(err)
      t.end()
    })
})

test('should reject invocation', t => {
  var target = path.join(__dirname, 'fixture', 'invoke')
  var bridge = getBridge()
  mm.mockPromise(bridge.runtime.descriptor.activity, 'ping', () => {
    throw new Error('foobar')
  })
  extApp('@test', { appHome: target }, bridge, /* mode */0, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(bridge => {
      bridge.emit(null, 'echo', [ 'ping' ])
      bridge.childProcess.on('message', message => {
        if (message.type !== 'test' && message.event !== 'invoke') {
          return
        }
        t.deepEqual(message.error, { name: 'Error', message: 'foobar' })
        bridge.suspend()
        t.end()
      })
    }, err => {
      t.error(err)
      t.end()
    })
})

test('should serialize resolved types', t => {
  var target = path.join(__dirname, 'fixture', 'invoke')
  var bridge = getBridge()

  var expected = { foo: 123, bar: { foo: 'bar' } }
  mm.mockPromise(bridge.runtime.descriptor.activity, 'ping', () => {
    return Promise.resolve(expected)
  })
  extApp('@test', { appHome: target }, bridge, /* mode */0, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(bridge => {
      bridge.emit(null, 'echo', [ 'ping' ])
      bridge.childProcess.on('message', message => {
        if (message.type !== 'test' && message.event !== 'invoke') {
          return
        }
        t.deepEqual(message.result, expected)
        bridge.suspend()
        t.end()
      })
    }, err => {
      t.error(err)
      t.end()
    })
})

test('should trigger events and pass arguments', t => {
  var target = path.join(__dirname, 'fixture', 'invoke')
  var bridge = getBridge()

  var expected = [ { foo: 123, bar: { foo: 'bar' } }, { bar: 'foo' } ]
  extApp('@test', { appHome: target }, bridge, /* mode */0, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(bridge => {
      bridge.emit('foobar', 'echo', expected)
      bridge.childProcess.on('message', message => {
        if (message.type !== 'test' && message.event !== 'event') {
          return
        }
        t.deepEqual(message.args, expected)
        bridge.suspend()
        t.end()
      })
    }, err => {
      t.error(err)
      t.end()
    })
})

test('should invoke method with expected arguments', t => {
  var target = path.join(__dirname, 'fixture', 'invoke')
  var bridge = getBridge()

  var expected = [ 123, '123', { foo: 'bar' } ]
  mm.mockPromise(bridge.runtime.descriptor.activity, 'ping', function (ctx) {
    t.deepEqual(ctx.args, expected)
    return 'OK'
  })
  extApp('@test', { appHome: target }, bridge, /* mode */0, { descriptorPath: path.join(__dirname, './test-descriptor.json') })
    .then(bridge => {
      bridge.emit(null, 'echo', [ 'ping', expected ])
      bridge.childProcess.on('message', message => {
        if (message.type !== 'test' && message.event !== 'invoke') {
          return
        }
        t.deepEqual(message.result, 'OK')
        bridge.suspend()
        t.end()
      })
    }, err => {
      t.error(err)
      t.end()
    })
})
