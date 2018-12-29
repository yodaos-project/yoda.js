var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('simultaneous cut app preemption', t => {
  t.plan(2)

  mock.restore()
  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.pass(`app ${appId} has been destructed`)
    }
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return Promise.all([
        life.activateAppById('0', 'cut'),
        life.activateAppById('1', 'cut')
      ])
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'last preempted app shall win the preemption')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('simultaneous scene app preemption', t => {
  t.plan(2)

  mock.restore()
  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.pass(`app ${appId} has been destructed`)
    }
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return Promise.all([
        life.activateAppById('0', 'scene'),
        life.activateAppById('1', 'scene')
      ])
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'last preempted app shall win the preemption')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('simultaneous scene and cut app preemption', t => {
  t.plan(1)

  mock.restore()
  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.fail(`scene app ${appId} shall not be destructed`)
    }
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return Promise.all([
        life.activateAppById('0', 'scene'),
        life.activateAppById('1', 'cut')
      ])
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'last preempted app shall win the preemption')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('simultaneous cut and scene app preemption', t => {
  t.plan(2)

  mock.restore()
  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.pass(`app ${appId} has been destructed`)
    }
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return Promise.all([
        life.activateAppById('0', 'cut'),
        life.activateAppById('1', 'scene')
      ])
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'last preempted app shall win the preemption')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
