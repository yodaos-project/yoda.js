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

test('should invoke runtime.exitAppById', t => {
  t.plan(3)
  var descriptor
  var runtime = {
    exitAppById: (appId, options) => {
      t.strictEqual(appId, '@test/app-id')
      t.deepEqual(options, { ignoreKeptAlive: true })
    }
  }
  extApp('@test/app-id', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'exit', [])
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'invoke') {
          return
        }
        t.error(msg.error)

        descriptor.destruct()
        t.end()
      })
    })
})

test('should invoke runtime.exitAppById with options', t => {
  t.plan(3)
  var descriptor
  var runtime = {
    exitAppById: (appId, options) => {
      t.strictEqual(appId, '@test/app-id')
      t.deepEqual(options, { ignoreKeptAlive: true, clearContext: true })
    }
  }
  extApp('@test/app-id', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'exit', [ { clearContext: true } ])
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'invoke') {
          return
        }
        t.error(msg.error)

        descriptor.destruct()
        t.end()
      })
    })
})
