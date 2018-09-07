var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('non-daemon inactive carrier shall be destroyed on preemption', t => {
  mock.restore()
  t.plan(1)

  var apps = mock.getMockAppExecutors(3)
  var life = new Lifetime(apps)

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
})

test('non-daemon background carrier shall be destroyed on preemption', t => {
  mock.restore()
  t.plan(1)

  var apps = mock.getMockAppExecutors(3)
  var life = new Lifetime(apps)

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
})
