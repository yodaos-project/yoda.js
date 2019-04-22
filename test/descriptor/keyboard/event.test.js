'use strict'

var test = require('tape')
var path = require('path')
var EventEmitter = require('events')
var _ = require('@yoda/util')._

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

test('should register interests on prevent defaults', t => {
  var descriptor
  var runtime = {}
  extApp('@test', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'keyboard.preventDefaults', [ 123, 'click' ])
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'invoke') {
          return
        }
        t.error(msg.error)
        console.log(msg)

        switch (msg.method) {
          case 'keyboard.preventDefaults': {
            t.strictEqual(_.get(descriptor, 'keyboard.interests.click.123'), true)
            descriptor.emit('test-invoke', 'keyboard.restoreDefaults', [ 123, 'click' ])
            break
          }
          case 'keyboard.restoreDefaults': {
            t.looseEqual(_.get(descriptor, 'keyboard.interests.click.123'), null)
            descriptor.destruct()
            t.end()
            break
          }
        }
      })
    })
})

test('should register all interests on prevent defaults with no event specified', t => {
  var descriptor
  var runtime = {}
  extApp('@test', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'keyboard.preventDefaults', [ 123 ])
      var events = Object.keys(descriptor.keyboard.interests)
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'invoke') {
          return
        }
        t.error(msg.error)

        switch (msg.method) {
          case 'keyboard.preventDefaults': {
            events.forEach(it => {
              t.strictEqual(_.get(descriptor, `keyboard.interests.${it}.123`), true, `${it} should be registered`)
            })
            descriptor.emit('test-invoke', 'keyboard.restoreDefaults', [ 123 ])
            break
          }
          case 'keyboard.restoreDefaults': {
            events.forEach(it => {
              t.looseEqual(_.get(descriptor, `keyboard.interests.${it}.123`), null, `${it} should be restored`)
            })
            descriptor.destruct()
            t.end()
            break
          }
        }
      })
    })
})

test('should unregister all interests on restore all', t => {
  var descriptor
  var runtime = {}
  var firstKeyCode = 123
  var nbrKeys = 5
  var keyCode = firstKeyCode
  extApp('@test', { appHome: target }, runtime)
    .then(res => {
      descriptor = res
      descriptor.emit('test-invoke', 'keyboard.preventDefaults', [ keyCode ])
      var events = Object.keys(descriptor.keyboard.interests)
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'invoke') {
          return
        }
        t.error(msg.error)

        switch (msg.method) {
          case 'keyboard.preventDefaults': {
            events.forEach(it => {
              t.strictEqual(_.get(descriptor, `keyboard.interests.${it}.${keyCode}`), true, `${it} should be registered`)
            })
            keyCode++
            if (keyCode < firstKeyCode + nbrKeys) {
              descriptor.emit('test-invoke', 'keyboard.preventDefaults', [ keyCode ])
            } else {
              descriptor.emit('test-invoke', 'keyboard.restoreAll')
            }
            break
          }
          case 'keyboard.restoreAll': {
            events.forEach(it => {
              for (var i = 0; i < nbrKeys; i++) {
                keyCode = firstKeyCode + i
                t.looseEqual(_.get(descriptor, `keyboard.interests.${it}.${keyCode}`), null, `${it} should be restored`)
              }
            })
            descriptor.destruct()
            t.end()
            break
          }
        }
      })
    })
})

test('should transfer events', t => {
  var descriptor
  var runtime = {}
  extApp('@test', { appHome: target }, runtime)
    .then(res => {
      descriptor = res

      var eventSplitter = new EventEmitter()
      descriptor._childProcess.on('message', msg => {
        if (msg.type !== 'test' || msg.event !== 'event') {
          return
        }
        eventSplitter.emit.apply(eventSplitter, [ msg.name ].concat(msg.params))
      })

      var events = Object.keys(descriptor.keyboard.interests)
      var times = 0
      events.forEach(it => {
        eventSplitter.on(`keyboard.${it}`, (event) => {
          t.deepEqual(event, { keyCode: 123 })
          ++times
          if (times === events.length) {
            descriptor.destruct()
            t.end()
          }
        })

        descriptor.keyboard.emit(it, { keyCode: 123 })
      })
    })
})
