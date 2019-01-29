'use strict'

var test = require('tape')
var path = require('path')
var EventEmitter = require('events')

var helper = require('../../helper')
var Descriptors = require(`${helper.paths.runtime}/lib/descriptor`)
var extApp = require(`${helper.paths.runtime}/lib/app/ext-app`)

var ActivityDescriptor = Descriptors.ActivityDescriptor
Object.assign(ActivityDescriptor.prototype, {
  'test-invoke': {
    type: 'event'
  }
})

var target = path.join(__dirname, 'fixture', 'ext-app')

test('descriptor should transfer normal events', t => {
  t.plan(3)
  var descriptor
  var runtime = {
    component: {
      permission: {
        check: () => true
      }
    },
    ttsMethod: () => {
      setTimeout(() => {
        descriptor.tts.handleEvent('start', '1')
        descriptor.tts.handleEvent('end', '1')
      }, 1000)
      return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
    }
  }
  extApp('@test/app-id', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'tts.speak', [ 'foobar' ])
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'invoke') {
          return
        }
        t.error(msg.error)

        descriptor.destruct()
        t.end()
      })

      var eventSplitter = new EventEmitter()
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'event') {
          return
        }
        eventSplitter.emit.apply(eventSplitter, [ msg.name ].concat(msg.params))
      })

      eventSplitter.on('tts.start', ttsId => {
        t.strictEqual(ttsId, '1')
      })

      eventSplitter.on('tts.end', ttsId => {
        t.strictEqual(ttsId, '1')
      })
    })
})

test('descriptor should not transfer error events for patient clients', t => {
  t.plan(2)
  var descriptor
  var runtime = {
    component: {
      permission: {
        check: () => true
      }
    },
    ttsMethod: () => {
      setTimeout(() => {
        descriptor.tts.handleEvent('start', '1')
        descriptor.tts.handleEvent('error', '1', 123)
      }, 1000)
      return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
    }
  }
  extApp('@test/app-id', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'tts.speak', [ 'foobar' ])
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'invoke') {
          return
        }
        t.deepEqual(msg.error, { name: 'Error', message: 'Unexpected ttsd error(123)', code: 123 })
        descriptor.destruct()
        t.end()
      })

      var eventSplitter = new EventEmitter()
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'event') {
          return
        }
        eventSplitter.emit.apply(eventSplitter, [ msg.name ].concat(msg.params))
      })

      eventSplitter.on('tts.start', ttsId => {
        t.strictEqual(ttsId, '1')
      })

      eventSplitter.on('tts.error', (ttsId, errno) => {
        t.fail('patient client should not receive error event')
      })
    })
})

test('descriptor should transfer error events for impatient clients', t => {
  t.plan(4)
  var descriptor
  var runtime = {
    component: {
      permission: {
        check: () => true
      }
    },
    ttsMethod: () => {
      setTimeout(() => {
        descriptor.tts.handleEvent('start', '1')
        descriptor.tts.handleEvent('error', '1', 123)
      }, 1000)
      return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
    }
  }
  extApp('@test/app-id', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'tts.speak', [ 'foobar', { impatient: true } ])
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'invoke') {
          return
        }
        t.error(msg.error)
      })

      var eventSplitter = new EventEmitter()
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'event') {
          return
        }
        eventSplitter.emit.apply(eventSplitter, [ msg.name ].concat(msg.params))
      })

      eventSplitter.on('tts.start', ttsId => {
        t.strictEqual(ttsId, '1')
      })

      eventSplitter.on('tts.error', (ttsId, errno) => {
        t.strictEqual(ttsId, '1')
        t.strictEqual(errno, 123)
        descriptor.destruct()
        t.end()
      })
    })
})
