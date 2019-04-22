var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('should destroy app by id', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(5)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    t.strictEqual(appId, '1')
  })

  life.createApp('1').then(() => {
    life.destroyAppById('1')
  })
})

test('should destroy app by id', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(5, true)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    t.strictEqual(appId, '1')
  })

  life.createApp('1').then(() => {
    life.destroyAppById('1', { force: true })
  })
})

test('should destroy all apps', t => {
  mock.restore()
  t.plan(5)

  mock.mockAppExecutors(5)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    t.pass(`${appId} destructed`)
  })

  Promise.all(_.times(5).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      life.destroyAll()
    })
})

test('should destroy all daemon apps by force', t => {
  mock.restore()
  t.plan(5)

  mock.mockAppExecutors(5, true)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    t.pass(`${appId} destructed`)
  })

  Promise.all(_.times(5).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      life.destroyAll({ force: true })
    })
})
