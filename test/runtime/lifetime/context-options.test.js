var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('setContextOptionsById shall merge options', t => {
  mock.restore()
  t.plan(3)

  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('1')
    })
    .then(() => {
      life.setContextOptionsById('1', { keepAlive: true })
      var options = life.getContextOptionsById('1')
      t.notLooseEqual(options, null)
      t.strictEqual(options.form, 'cut')
      t.strictEqual(options.keepAlive, true)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('kept alive app shall be put in background on deactivating', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0')
    })
    .then(() => {
      life.setContextOptionsById('0', { keepAlive: true })
      return life.deactivateAppById('0')
    })
    .then(() => {
      t.strictEqual(life.isBackgroundApp('0'), true)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('kept alive cut app shall be put in background on preemption', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0')
    })
    .then(() => {
      life.setContextOptionsById('0', { keepAlive: true })
      return life.activateAppById('1')
    })
    .then(() => {
      t.strictEqual(life.isBackgroundApp('0'), true)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('kept alive scene app shall not be put in background on cut preemption', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'scene')
    })
    .then(() => {
      life.setContextOptionsById('0', { keepAlive: true })
      return life.activateAppById('1')
    })
    .then(() => {
      t.strictEqual(life.isBackgroundApp('0'), false)
      t.strictEqual(life.activeSlots.scene, '0')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
