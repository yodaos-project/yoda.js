var test = require('tape')

var _ = require('@yoda/util')._
var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('shall evict cut app on deactivate', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(1)
  var life = new Lifetime(mock.runtime)

  life.on('eviction', (appId, form) => {
    t.strictEqual(appId, '0')
    t.strictEqual(form, 'cut')
  })

  life.createApp('0')
    .then(() => {
      return life.activateAppById('0')
    })
    .then(() => {
      return life.deactivateAppById('0')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall evict scene app on deactivate', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(1)
  var life = new Lifetime(mock.runtime)

  life.on('eviction', (appId, form) => {
    t.strictEqual(appId, '0')
    t.strictEqual(form, 'scene')
  })

  life.createApp('0')
    .then(() => {
      return life.activateAppById('0', 'scene')
    })
    .then(() => {
      return life.deactivateAppById('0')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall evict cut app on cut preemption', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  life.on('eviction', (appId, form) => {
    t.strictEqual(appId, '0', 'appId shall be 0')
    t.strictEqual(form, 'cut', 'form shall be cut')
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'cut')
    })
    .then(() => {
      return life.activateAppById('1', 'cut')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall evict cut app on scene preemption', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  life.on('eviction', (appId, form) => {
    t.strictEqual(appId, '0', 'appId shall be 0')
    t.strictEqual(form, 'cut', 'form shall be cut')
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'cut')
    })
    .then(() => {
      return life.activateAppById('1', 'scene')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall not evict scene app on cut preemption', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  life.on('eviction', (appId, form) => {
    t.fail('no eviction')
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'scene')
    })
    .then(() => {
      return life.activateAppById('1', 'cut')
    })
    .then(() => {
      t.pass()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall evict scene app on scene preemption', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  life.on('eviction', (appId, form) => {
    t.strictEqual(appId, '0')
    t.strictEqual(form, 'scene')
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'scene')
    })
    .then(() => {
      return life.activateAppById('1', 'scene')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall not evict on app form upgrade', t => {
  mock.restore()
  t.plan(1)

  mock.mockAppExecutors(2)
  var life = new Lifetime(mock.runtime)

  life.on('eviction', (appId, form) => {
    t.fail('no eviction shall be made')
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0', 'cut')
    })
    .then(() => {
      console.log(life.activeSlots)
      return life.activateAppById('0', 'scene')
    })
    .then(() => {
      t.pass()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall evict cut app on setBackground', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  life.on('eviction', (appId, form) => {
    t.strictEqual(appId, '0')
    t.strictEqual(form, 'cut')
  })

  life.createApp('0')
    .then(() => {
      return life.activateAppById('0')
    })
    .then(() => {
      return life.setBackgroundById('0')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall evict scene app on setBackground', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  life.on('eviction', (appId, form) => {
    t.strictEqual(appId, '0')
    t.strictEqual(form, 'scene')
  })

  life.createApp('0')
    .then(() => {
      return life.activateAppById('0', 'scene')
    })
    .then(() => {
      return life.setBackgroundById('0')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
