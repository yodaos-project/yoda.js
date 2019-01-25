var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('non-daemon inactive carrier shall be destroyed on preemption', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    console.log('event destruct', appId)
    if (appId === '0') {
      t.pass('app shall be destroyed')
    }
  })

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'cut')
    })
    .then(() => {
      return life.activateAppById('1', 'cut', '0')
    })
    .then(() => {
      return life.activateAppById('2')
    })
    .then(() => {
      t.pass('shall end with no error')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('non-daemon background carrier shall be destroyed on preemption', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.pass('app shall be destroyed')
    }
  })

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'cut')
    })
    .then(() => {
      return life.setBackgroundById('0')
    })
    .then(() => {
      return life.activateAppById('1', 'cut', '0')
    })
    .then(() => {
      return life.activateAppById('2')
    })
    .then(() => {
      t.pass('shall end with no error')
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
  var life = new Lifetime(mock.runtime)

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

test('carrier shall be re-activated on app set background proactively', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('1', 'cut', '0')
    })
    .then(() => {
      return life.setBackgroundById('1')
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

test('previous cut app shall be destroyed on activating cut carrier proactively', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '1') {
      t.pass('app "1" shall be destroyed')
    }
  })

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('1', 'cut', '0')
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

test('previous scene app shall not be destroyed on carrier starting a cut app', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.fail('app "1" shall not be deactivated')
    }
  })

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'scene')
    })
    .then(() => {
      return life.activateAppById('2', 'cut')
    })
    .then(() => {
      return life.activateAppById('1', 'cut', '2')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('carrier app shall not be destroyed on carrier starting a new app with previous started scene app', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.fail('app "1" shall not be deactivated')
    }
    if (appId === '2') {
      t.fail('carrier app "2" shall not be deactivated')
    }
  })

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'scene', '2')
    })
    .then(() => {
      return life.activateAppById('1', 'cut', '2')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('previous scene app shall not be destroyed on carrier starting it with cut form', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  mock.eventBus.on('destruct', appId => {
    if (appId === '0') {
      t.fail('app "0" shall not be deactivated')
    }
  })

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'scene')
    })
    .then(() => {
      return life.activateAppById('2', 'cut')
    })
    .then(() => {
      return life.activateAppById('0', 'cut', '2')
    })
    .then(() => {
      return life.activateAppById('1')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
