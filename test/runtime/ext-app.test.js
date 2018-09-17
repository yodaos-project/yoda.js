'use strict'

var test = require('tape')
var path = require('path')
var EventEmitter = require('events')

var helper = require('../helper')
var Descriptors = require(`${helper.paths.runtime}/lib/app/activity-descriptor`)
var extApp = require(`${helper.paths.runtime}/lib/app/ext-app`)

var ActivityDescriptor = Descriptors.ActivityDescriptor
var MultimediaDescriptor = Descriptors.MultimediaDescriptor
var TtsDescriptor = Descriptors.TtsDescriptor
var LightDescriptor = Descriptors.LightDescriptor
var KeyboardDescriptor = Descriptors.KeyboardDescriptor

Object.assign(ActivityDescriptor.prototype, {
  testMethod: {
    type: 'method',
    returns: 'promise',
    fn: function testMethod() {
      return this._runtime.testMethod.apply(this._runtime, arguments)
    }
  },
  'test-ack': {
    type: 'event-ack',
    trigger: 'onTestAck'
  },
  'test-err': {
    type: 'event'
  },
  'light-test': {
    type: 'event'
  },
  'testValueString': {
    type: 'value',
    value: 'test-value'
  },
  'testValueNumber': {
    type: 'value',
    value: 100
  },
  'testValueObject': {
    type: 'value',
    value: {
      key: 'key',
      value: 'value'
    }
  },
})
Object.assign(LightDescriptor.prototype, {
  lighttest: {
    type: 'method',
    returns: 'promise',
    fn: function lighttest(num) {
      return new Promise((resolve, reject) => {
        if (num >= 0) {
          resolve('true')
        } else {
          reject(new Error('num < 0'))
        }
      })
    }
  }
})

test('create ext-app: appHome is null', t => {
  var runtime = new EventEmitter()
  extApp('@test/ipc-test', null, runtime).then(descriptor => {
    t.fail('appHome is null')
  }, err => {
    console.log(err)
    t.ok(err !== null)
    t.end()
  })
})

test('create ext-app: runtime is err path', t => {
  var appHome = path.join(helper.paths.fixture, 'errapp')
  extApp('@test/ipc-test', appHome, null).then(descriptor => {
    t.fail('appHome is err path')
  }, err => {
    console.log(err)
    t.ok(err !== null)
    t.end()
  })
})

test('should listen events', t => {
  var target = path.join(helper.paths.fixture, 'simple-app')

  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
    .then(descriptor => {
      console.log(descriptor)
      var activityEvents = Object.keys(ActivityDescriptor.prototype).filter(key => {
        var desc = ActivityDescriptor.prototype[key]
        return desc.type === 'event'
      })
      var multimediaEvents = Object.keys(MultimediaDescriptor.prototype).filter(key => {
        var desc = MultimediaDescriptor.prototype[key]
        return desc.type === 'event'
      })
      var ttsEvent = Object.keys(TtsDescriptor.prototype).filter(key => {
        var desc = TtsDescriptor.prototype[key]
        return desc.type === 'event'
      })
      var lightEvent = Object.keys(LightDescriptor.prototype).filter(key => {
        var desc = LightDescriptor.prototype[key]
        return desc.type === 'event'
      })
      var keyboardEvent = Object.keys(KeyboardDescriptor.prototype).filter(key => {
        var desc = KeyboardDescriptor.prototype[key]
        return desc.type === 'event'
      })

      activityEvents.forEach(it => {
        t.assert(descriptor.listeners(it).length > 0, `event '${it}' should have been listened.`)
      })
      multimediaEvents.forEach(it => {
        t.assert(descriptor.media.listeners(it).length > 0, `media event '${it}' should have been listened.`)
      })
      ttsEvent.forEach(it => {
        t.assert(descriptor.tts.listeners(it).length > 0, `tts event ${it} should have been listened.`)
      })
      lightEvent.forEach(it => {
        t.assert(descriptor.light.listeners(it).length > 0, `light event ${it} should have been listened.`)
      })
      keyboardEvent.forEach(it => {
        t.assert(descriptor.keyboard.listeners(it).length > 0, `keyboard event ${it} should have been listened.`)
      })

      descriptor.destruct()
      t.end()
    }, err => {
      t.error(err)
      t.end()
    })
})

test('add test method, return resolve', t => {
  var target = path.join(helper.paths.fixture, 'ext-app')
  var runtime = new EventEmitter()
  t.plan(4)
  extApp('@test', target, runtime)
    .then(descriptor => {
      t.equal(typeof descriptor.light.lighttest, 'object')
      t.equal(descriptor.light.lighttest.type, 'method')
      t.equal(descriptor.light.lighttest.returns, 'promise')
      descriptor.emit('light-test', 'lighttest', 90)
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test' && message.event !== 'invoke') {
          return
        }
        t.equal(message.result, 'true', 'on resolve')
        descriptor.destruct()
        t.end()
      })
    }, err => {
      t.error(err)
      t.end()
    })
})

test('add test method, return reject', t => {
  var target = path.join(helper.paths.fixture, 'ext-app')
  var runtime = new EventEmitter()
  t.plan(4)
  extApp('@test', target, runtime)
    .then(descriptor => {
      t.equal(typeof descriptor.light.lighttest, 'object')
      t.equal(descriptor.light.lighttest.type, 'method')
      t.equal(descriptor.light.lighttest.returns, 'promise')
      descriptor.emit('light-test', 'lighttest', -9)
      descriptor._childProcess.on('message', message => {
        console.log('message')
        console.log(message)
        if (message.type !== 'test' && message.event !== 'invoke') {
          return
        }
        t.equal(message.error, 'num < 0', 'on reject')
        descriptor.destruct()
        t.end()
      })
    }, err => {
      t.error(err)
      t.end()
    })
})

test('add descriptor type = value', t => {
  var target = path.join(helper.paths.fixture, 'ext-app')
  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
    .then(descriptor => {
      console.log(descriptor)
      descriptor.emit('resume', 'testValueString', 'testValueObject', 'testValueNumber')
      descriptor._childProcess.on('message', message => {
        t.equal(message.string, descriptor.testValueString.value, 'string')
        t.equal(message.number, descriptor.testValueNumber.value, 'number')
        t.equal(typeof message.number, 'number')
        t.deepEquals(message.object, descriptor.testValueObject.value, 'object')
      })
      descriptor.destruct()
      t.end()
    }, err => {
      console.log('testtest test')
      t.error(err)
      t.end()
    })
})

test('should subscribe event-ack', t => {
  var target = path.join(helper.paths.fixture, 'simple-app')

  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
    .then(descriptor => {
      var activityEvents = Object.keys(ActivityDescriptor.prototype).filter(key => {
        var desc = ActivityDescriptor.prototype[key]
        return desc.type === 'event-ack'
      })

      activityEvents.forEach(it => {
        var eventDescriptor = descriptor[it]
        t.strictEqual(typeof descriptor[eventDescriptor.trigger], 'function',
          `event-ack '${it}' should have been subscribed.`)
      })

      descriptor.destruct()
      t.end()
    }, err => {
      t.error(err)
      t.end()
    })
})

test('should trigger events and pass arguments', t => {
  t.plan(2)
  var target = path.join(helper.paths.fixture, 'ext-app')

  var nlp = {
    foo: 'bar'
  }
  var action = {
    appId: '@test'
  }
  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
    .then(descriptor => {
      descriptor.emit('request', nlp, action)
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        t.strictEqual(message.event, 'request')
        t.deepEqual(message.args, [nlp, action])

        descriptor.destruct()
      })
    })
})

test('should trigger events in namespaces and pass arguments', t => {
  t.plan(3)
  var target = path.join(helper.paths.fixture, 'ext-app')

  var arg1 = {
    foo: 'bar'
  }
  var arg2 = {
    appId: '@test'
  }
  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
    .then(descriptor => {
      descriptor.tts.emit('end', arg1, arg2)
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        t.strictEqual(message.namespace, 'tts')
        t.strictEqual(message.event, 'end')
        t.deepEqual(message.args, [arg1, arg2])

        descriptor.destruct()
      })
    })
})

test('should trigger events and acknowledge it', t => {
  t.plan(5)
  var target = path.join(helper.paths.fixture, 'ext-app')

  var nlp = {
    foo: 'bar'
  }
  var action = {
    appId: '@test'
  }
  var runtime = new EventEmitter()
  extApp('@test', target, runtime)
    .then(descriptor => {
      var promise
      var err
      try {
        promise = descriptor.onTestAck(nlp, action)
          .then(() => {
            t.pass('event ack resolved')
          }, err => t.error(err))
      } catch (error) {
        err = error
      }

      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        t.strictEqual(message.event, 'test-ack')
        t.deepEqual(message.args, [nlp, action])

        descriptor.destruct()
      })

      t.assert(typeof promise === 'object', 'onTestAck should return a promise')
      t.error(err, 'should not thrown on onTestAck')
    })
})

test('should invoke methods and callback', t => {
  t.plan(3)
  var target = path.join(helper.paths.fixture, 'ext-app')

  var expectedData = {
    foo: 'bar'
  }
  var runtime = {
    testMethod: function testMethod(arg1, arg2) {
      t.strictEqual(arg1, 'foo')
      t.strictEqual(arg2, 'bar')
      return Promise.resolve(expectedData)
    }
  }
  extApp('@test', target, runtime)
    .then(descriptor => {
      descriptor.emit('create')
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test' || message.event !== 'create') {
          return
        }
        var data = message.data
        t.deepEqual(data, expectedData)
        descriptor.destruct()
      })
    })
})

/**
 * bug ?
 */
test.skip('double subscription on event-ack', t => {
  Object.assign(ActivityDescriptor.prototype, {
    'test-suback': {
      type: 'event-ack',
      trigger: 'get'
    },
  })
  var appHome = path.join(helper.paths.fixture, 'ext-app')
  var runtime = {}
  extApp('@test-app', appHome, runtime).then(descriptor => {
    t.fail('should throw error')
    t.end()
  }, err => {
    t.error(err)
    t.end()
  })
})
