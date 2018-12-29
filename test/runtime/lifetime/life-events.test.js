var test = require('tape')

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('non-daemon app life events', t => {
  mock.restore()
  t.plan(3)

  mock.eventBus.on('create', (appId, app) => {
    if (appId === '0') {
      app.on('create', () => {
        t.pass('create event shall be emitted')
      })
      app.on('destroy', () => {
        t.pass('destroy event shall be emitted')
      })
    }
  })
  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
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
})

test('daemon app life events', t => {
  mock.restore()
  t.plan(6)

  mock.eventBus.on('create', (appId, app) => {
    if (appId === '0') {
      app.on('create', () => {
        t.pass('create event shall be emitted')
      })
      app.on('background', () => {
        t.pass('background event shall be emitted')
      })
      app.on('active', () => {
        t.pass('active event shall be emitted')
      })
      app.on('destroy', () => {
        /** destroy shall be emitted twice */
        t.pass('destroy event shall be emitted')
      })
    }
  })
  mock.mockAppExecutors(1, true)
  mock.mockAppExecutors(1, false, 1)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.pass('app shall be destroyed')
    }
  })

  life.createApp('0')
    .then(() => {
      /** daemon app is create as inactive app, 'background' event shall be emitted */
      return life.setBackgroundById('0')
    })
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
      /** evict app '0' from stack, emit 'destroy' event */
      return life.activateAppById('1')
    })
    .then(() => {
      return life.destroyAppById('0', { force: true })
    })
})
