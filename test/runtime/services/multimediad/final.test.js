var test = require('tape')
var path = require('path')
var Dbus = require('dbus')
var EventEmitter = require('events').EventEmitter
var Remote = require('/usr/yoda/lib/dbus-remote-call.js')

// require('/usr/yoda/services/multimediad/index.js')

var media = new Remote(Dbus.getBus('session'), {
  dbusService: 'com.service.multimedia',
  dbusObjectPath: '/multimedia/service',
  dbusInterface: 'multimedia.service'
})

var bus = new EventEmitter()

media.listen('com.service.multimedia', '/multimedia/service', 'multimedia.service', function (event) {
  bus.emit(`${event.args[1]}-${event.args[0]}`, event.args.slice(2))
})

test('Integration Testing multimediad: start and stop', (t) => {
  media.invoke('start', ['@test', path.join(__dirname, './firstguide.ogg'), 'playback'])
    .then((res) => {
      t.pass('method call [start] success')
      bus.on(`prepared-${res[1]}`, (args) => {
        t.pass('multimediad emit prepared with correct id')
        media.invoke('stop', ['@test'])
          .then(() => {
            t.pass('method call [stop] success')
            t.end()
          })
          .catch(() => {
            t.fail('method call [stop] failed')
          })
      })
      bus.on(`cancel-${res[1]}`, (args) => {
        t.pass('multimediad emit cancel with correct id')
      })
    })
    .catch(() => {
      t.fail('method call [start] failed')
    })
})

test('Integration Testing multimediad: pause an resume', (t) => {
  media.invoke('start', ['@test', path.join(__dirname, './firstguide.ogg'), 'playback'])
    .then((res) => {
      bus.on(`prepared-${res[1]}`, (args) => {
        t.pass('multimediad emit prepared with correct id')
        media.invoke('pause', ['@test'])
          .then(() => {
            t.pass('method call [pause] success')
            return media.invoke('resume', ['@test'])
              .then(() => {
                t.pass('method call [resume] success')
              })
              .catch(() => {
                t.fail('method call [resume] failed')
              })
          })
          .then(() => {
            return media.invoke('stop', ['@test'])
              .then(() => {
                t.pass('method call [stop] success')
                t.end()
              })
              .catch(() => {
                t.fail('method call [stop] failed')
              })
          })
          .catch(() => {
            t.fail('method call [pause] failed')
          })
      })
      bus.on(`paused-${res[1]}`, (args) => {
        t.pass('multimediad emit paused with correct id')
      })
      bus.on(`resumed-${res[1]}`, (args) => {
        t.pass('multimediad emit resumed with correct id')
      })
      bus.on(`cancel-${res[1]}`, (args) => {
        t.pass('multimediad emit cancel with correct id')
      })
      t.pass('method call [start] success')
    })
    .catch(() => {
      t.fail('method call [start] failed')
    })
})
