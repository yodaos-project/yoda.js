var test = require('tape')
var _ = require('@yoda/util')._

var bootstrap = require('./bootstrap')

test('app preemption', t => {
  var tt = bootstrap()
  var life = tt.component.lifetime

  Promise.all(_.times(5).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      _.times(5).forEach(idx => t.strictEqual(life.scheduler.isAppRunning(`${idx}`), true, `app ${idx} should be running`))

      return life.activateAppById('0')
    })
    .then(() => {
      t.deepEqual(life.activitiesStack, [ '0' ])
      t.strictEqual(life.getCurrentAppId(), '0', 'app preempts top of stack')

      return life.activateAppById('1')
    })
    .then(() => {
      t.deepEqual(life.activitiesStack, [ '0', '1' ])
      t.strictEqual(life.getCurrentAppId(), '1', 'app preempts top of stack')
      t.looseEqual(life.getContextOptionsById('0'), null, 'app data of apps that get out of stack app shall be removed')

      life.once('preemption', appId => {
        t.strictEqual(appId, '1', 'shall emit preemption event of app 1')
      })
      return life.activateAppById('2')
    })
    .then(() => {
      t.deepEqual(life.activitiesStack, [ '0', '1', '2' ])
      t.strictEqual(life.getCurrentAppId(), '2', 'app preempts top of stack')
      t.notLooseEqual(life.scheduler.getAppById('1'), null, 'app shall not be destroyed on preemption by another app')

      life.once('preemption', appId => {
        t.strictEqual(appId, '2', 'shall emit preemption event of app 2')
      })
      return life.deactivateAppById('2')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'app shall return to top of stack on deactivation of top app')
      t.deepEqual(life.activitiesStack, [ '0', '1' ])
      t.looseEqual(life.scheduler.getAppById('2'), null, 'app shall be destroyed on deactivation')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall not deactivate app if app to be activated is in stack', t => {
  var tt = bootstrap()
  var life = tt.component.lifetime

  Promise.all(_.times(5).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      tt.bus.on('suspend', appId => {
        if (appId === '0') {
          t.fail('app 0 shall not be destroyed')
        }
      })
      return life.activateAppById('0')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '0', 'app preempts top of stack')
      t.deepEqual(life.activitiesStack, [ '0' ])
      return life.activateAppById('0')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '0', 'app preempts top of stack')
      t.deepEqual(life.activitiesStack, [ '0' ])
      return life.activateAppById('1')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'app preempts top of stack')
      t.deepEqual(life.activitiesStack, [ '0', '1' ])
      return life.activateAppById('0')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '0', 'app preempts top of stack')
      t.deepEqual(life.activitiesStack, [ '1', '0' ])
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall not recover if app to be deactivated is paused', t => {
  t.plan(1)
  var tt = bootstrap()
  var life = tt.component.lifetime

  Promise.all(_.times(5).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.activateAppById('0')
    })
    .then(() => {
      return life.activateAppById('1')
    })
    .then(() => {
      t.deepEqual(life.activitiesStack, [ '0', '1' ])
      life.scheduler.getAppById('1').subscribe('activity', 'resumed', () => {
        t.fail('app 1 shall not be resumed')
      })
      return life.deactivateAppById('0')
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('shall not throw on activating if previous app is not alive', t => {
  var tt = bootstrap()
  var life = tt.component.lifetime

  Promise.all(_.times(1).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      life.activitiesStack = [ '1' ]
      life.contextOptionsMap['1'] = {}

      t.strictEqual(life.getCurrentAppId(), '1', 'app 1 shall be active thought it\'s not alive')

      return life.activateAppById('0')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '0')
      t.deepEqual(life.activitiesStack, [ '1', '0' ])

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
