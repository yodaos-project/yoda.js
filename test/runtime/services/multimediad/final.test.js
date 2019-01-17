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

test('Integration Testing multimediad', (t) => {
  t.plan(4)
  media.invoke('start', ['@test', path.join(__dirname, './firstguide.ogg'), 'playback'])
    .then((res) => {
      t.pass('method call [start] success')
      bus.on(`prepared-${res[1]}`, (args) => {
        t.pass('multimediad emit prepared with correct id')
      })
      bus.on(`cancel-${res[1]}`, (args) => {
        t.pass('multimediad emit cancel with correct id')
      })
      media.invoke('stop', ['@test'])
        .then(() => {
          t.pass('method call [stop] success')
        })
        .catch(() => {
          t.fail('method call [stop] failed')
        })
    })
    .catch(() => {
      t.fail('method call [start] failed')
    })
})
