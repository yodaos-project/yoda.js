var test = require('tape')

var _ = require('@yoda/util')._
var bootstrap = require('./bootstrap')

test('shall evict app on deactivate', t => {
  t.plan(1)
  var tt = bootstrap()

  var life = tt.component.lifetime

  life.on('eviction', (appId) => {
    t.strictEqual(appId, '0')
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

test('shall not evict app on preemption', t => {
  t.plan(1)
  var tt = bootstrap()

  var life = tt.component.lifetime

  life.on('eviction', (appId) => {
    t.fail('no app should be evicted')
  })

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0')
    })
    .then(() => {
      return life.activateAppById('1')
    })
    .then(() => {
      t.pass()
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
