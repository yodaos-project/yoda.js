var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('shall throw on life cycle if app is not alive', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  t.doesNotThrow(() => {
    life.onLifeCycle('1', 'ready')
      .then(ret => {
        t.fail('not reachable path')
      })
      .catch(err => {
        t.throws(() => { throw err }, 'Trying to send life cycle')
      })
  })
})

test('deactivateCutApp should only deactivate cut app', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => life.activateAppById('1', 'scene'))
    .then(() => life.deactivateCutApp())
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1')
    })
    .then(() => life.activateAppById('2', 'cut'))
    .then(() => life.deactivateCutApp())
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1')
    })
})

test('deactivateCutApp should only deactivate expected cut app', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => life.activateAppById('1', 'scene'))
    .then(() => life.deactivateCutApp())
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1')
    })
    .then(() => life.activateAppById('2', 'cut'))
    .then(() => life.deactivateCutApp({ appId: '1' }))
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '2')
    })
})
