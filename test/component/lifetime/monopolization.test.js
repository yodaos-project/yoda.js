var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('monopolization', t => {
  mock.restore()
  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      life.monopolist = '1'

      t.strictEqual(life.isMonopolized(), false, 'monologue shall not be started by app not on top of stack')

      return life.activateAppById('1')
    })
    .then(() => {
      life.monopolist = '1'
      t.strictEqual(life.getCurrentAppId(), '1')
      t.strictEqual(life.isMonopolized(), true, 'monologue shall be started by app top of stack')

      return life.activateAppById('2')
        .then(() => {
          t.fail('app 2 shall not interrupt monologue of app 1')
        })
        .catch(err => {
          t.strictEqual(err.message, 'App 1 monopolized top of stack.')
        })
    })
    .then(() => {
      return life.destroyAppById('1')
    })
    .then(() => {
      t.strictEqual(life.isMonopolized(), false, 'monologue shall not be continue by app not on top of stack')

      return life.activateAppById('2')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '2')
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('monopolist could be activated repetitively', t => {
  mock.restore()
  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      life.monopolist = '1'

      t.strictEqual(life.isMonopolized(), false, 'monologue shall not be started by app not on top of stack')

      return life.activateAppById('1')
    })
    .then(() => {
      life.monopolist = '1'
      t.strictEqual(life.getCurrentAppId(), '1')
      t.strictEqual(life.isMonopolized(), true, 'monologue shall be started by app top of stack')

      return life.activateAppById('1')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1')
      t.strictEqual(life.isMonopolized(), true, 'monologue shall be started by app top of stack')

      return life.destroyAppById('1')
    })
    .then(() => {
      t.strictEqual(life.isMonopolized(), false, 'monologue shall not be continue by app not on top of stack')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('scene monopolist could be temporarily paused by a cut app', t => {
  mock.restore()
  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('1', 'scene')
    })
    .then(() => {
      life.monopolist = '1'
      t.strictEqual(life.getCurrentAppId(), '1')
      t.strictEqual(life.isMonopolized(), true, 'monologue shall be started by app top of stack')

      return life.activateAppById('2', 'cut')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '2')
      t.strictEqual(life.isMonopolized(), true, 'monologue shall still available by app in stack')
      t.strictEqual(life.monopolist, '1')

      return life.deactivateAppById('2')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1')
      t.strictEqual(life.isMonopolized(), true, 'monologue shall continue by app top of stack')
      return life.deactivateAppById('1')
    })
    .then(() => {
      t.strictEqual(life.isMonopolized(), false, 'monologue shall not be continue by app not on top of stack')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
