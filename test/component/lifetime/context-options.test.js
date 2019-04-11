var test = require('tape')
var _ = require('@yoda/util')._

var bootstrap = require('./bootstrap')

test('setContextOptionsById shall merge options', t => {
  t.plan(2)
  var tt = bootstrap()

  var life = tt.component.lifetime

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('1')
    })
    .then(() => {
      life.setContextOptionsById('1', { keepAlive: true })
      var options = life.getContextOptionsById('1')
      t.notLooseEqual(options, null)
      t.strictEqual(options.keepAlive, true)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
