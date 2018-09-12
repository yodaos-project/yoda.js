var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('non-daemon inactive carrier shall be destroyed on preemption', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.appLoader)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.pass('app shall be destroyed')
    }
  })

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('1', 'cut', '0')
    })
    .then(() => {
      return life.activateAppById('2')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('non-daemon background carrier shall be destroyed on preemption', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.appLoader)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.pass('app shall be destroyed')
    }
  })

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.setBackgroundById('0')
    })
    .then(() => {
      return life.activateAppById('1', 'cut', '0')
    })
    .then(() => {
      return life.activateAppById('2')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('carrier shall be re-activated on app deactivated proactively', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.appLoader)

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('1', 'cut', '0')
    })
    .then(() => {
      return life.deactivateAppById('1')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '0')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('previous app shall be destroyed on activating carrier proactively', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.appLoader)

  mock.eventBus.on('destruct', appId => {
    if (appId === '1') {
      t.pass('app "1" shall be destroyed')
    }
  })

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('1', 'scene', '0')
    })
    .then(() => {
      return life.activateAppById('0')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '0')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
