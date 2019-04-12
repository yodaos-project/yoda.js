var test = require('tape')

var bootstrap = require('./bootstrap')

test('app life events', t => {
  t.plan(4)

  var tt = bootstrap()
  var life = tt.component.lifetime

  tt.bus.on('create', (appId, bridge) => {
    if (appId === '0') {
      bridge.subscribe('activity', 'created', () => {
        t.pass('create event shall be emitted')
      })
      bridge.subscribe('activity', 'destroyed', () => {
        t.fail('destroy event shall not be emitted')
      })
    }
    if (appId === '1') {
      bridge.subscribe('activity', 'created', () => {
        t.pass('create event shall be emitted')
      })
      bridge.subscribe('activity', 'destroyed', () => {
        t.pass('destroy event shall be emitted')
      })
    }
  })
  tt.bus.on('suspend', appId => {
    if (appId === '0') {
      t.fail('app shall not be destroyed')
    }
    if (appId === '1') {
      t.pass('app shall be destroyed')
    }
  })

  life.createApp('0')
    .then(() => {
      return life.activateAppById('0')
    })
    .then(() => {
      /** create app twice shall only emit one 'create' event */
      return life.createApp('0')
    })
    .then(() => {
      return life.createApp('1')
    })
    .then(() => {
      return life.activateAppById('1')
    })
    .then(() => {
      return life.deactivateAppById('1')
    })
})
