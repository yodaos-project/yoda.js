var test = require('tape')
var _ = require('@yoda/util')._

var bootstrap = require('./bootstrap')

test('simultaneous app preemption', t => {
  t.plan(2)

  var tt = bootstrap()
  var life = tt.component.lifetime

  Promise.all(_.times(2).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return Promise.all([
        life.activateAppById('0'),
        life.activateAppById('1')
      ])
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'last preempted app shall win the preemption')
      t.deepEqual(life.activitiesStack, [ '0', '1' ])

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
