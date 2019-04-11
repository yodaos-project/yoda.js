var test = require('tape')
var _ = require('@yoda/util')._

var bootstrap = require('./bootstrap')

test('should destroy app by id', t => {
  t.plan(1)

  var tt = bootstrap()
  var life = tt.component.lifetime

  tt.bus.on('suspend', appId => {
    t.strictEqual(appId, '1')
  })

  life.createApp('1').then(() => {
    life.suspendAppById('1')
  })
})

test('should destroy app by id', t => {
  t.plan(1)

  var tt = bootstrap()
  var life = tt.component.lifetime

  tt.bus.on('suspend', appId => {
    t.strictEqual(appId, '1')
  })

  life.createApp('1').then(() => {
    life.suspendAppById('1', { force: true })
  })
})

test('should destroy all apps', t => {
  t.plan(5)

  var tt = bootstrap()
  var life = tt.component.lifetime

  tt.bus.on('suspend', appId => {
    t.pass(`${appId} suspended`)
  })

  Promise.all(_.times(5).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      life.suspendAll()
    })
})
