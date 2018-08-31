'use strict'

var test = require('tape')
var path = require('path')

var Descriptors = require('/usr/lib/yoda/runtime/lib/app/activity-descriptor')
var extApp = require('/usr/lib/yoda/runtime/lib/app/ext-app')

var ActivityDescriptor = Descriptors.ActivityDescriptor
Object.assign(ActivityDescriptor.prototype, {
  invoke: {
    type: 'event'
  }
})

var target = path.join(__dirname, '..', 'fixture', 'ext-app')
test('getAppId should return app id', t => {
  t.plan(1)

  var runtime = {}
  extApp(target, '@test/app-id', runtime)
    .then(descriptor => {
      descriptor.emit('invoke', 'getAppId', [])
      descriptor.childProcess.on('message', message => {
        if (message.type !== 'test') {
          return
        }
        var result = message.result
        t.strictEqual(result, '@test/app-id')
        descriptor.destruct()
      })
    })
})
