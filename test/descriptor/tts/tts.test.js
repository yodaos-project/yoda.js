'use strict'

var test = require('tape')
var path = require('path')

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

test('descriptor should register request', t => {
  t.plan(3)
  var runtime = {
    component: {
      permission: {
        check: () => true
      }
    },
    ttsMethod: () => Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
  }
  extApp('@test/app-id', { appHome: target }, runtime)
    .then(descriptor => {
      descriptor.emit('test-invoke', 'tts.speak', [ 'foobar', { impatient: true } ])
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test' || message.event !== 'invoke') {
          return
        }
        t.error(message.error)
        t.strictEqual(message.result, '1')
        t.notLooseEqual(descriptor.tts._requests['1'], null)
        descriptor.destruct()
        t.end()
      })
    })
})

test('descriptor should clear request on spoken', t => {
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
        descriptor.tts.handleEvent('end', '1')
      }, 1000)
      return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
    }
  }
  extApp('@test/app-id', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'tts.speak', [ 'foobar' ])
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test' || message.event !== 'invoke') {
          return
        }
        t.error(message.error)
        t.looseEqual(descriptor.tts._requests['1'], null)
        descriptor.destruct()
        t.end()
      })
    })
})

test('descriptor should clear request on spoken', t => {
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
        descriptor.tts.handleEvent('error', '1', 123)
      }, 1000)
      return Promise.resolve(/** flora.Reply */{ msg: [ '1' ] })
    }
  }
  extApp('@test/app-id', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'tts.speak', [ 'foobar' ])
      descriptor._childProcess.on('message', message => {
        if (message.type !== 'test' || message.event !== 'invoke') {
          return
        }
        t.strictEqual(message.error.message, 'Unexpected ttsd error(123)')
        t.strictEqual(message.error.code, 123)
        descriptor.destruct()
        t.end()
      })
    })
})
