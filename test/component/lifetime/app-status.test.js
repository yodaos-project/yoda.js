var test = require('tape')

var bootstrap = require('./bootstrap')

test('app status', t => {
  var tt = bootstrap()

  var life = tt.component.lifetime

  life.createApp('1')
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), undefined, 'should have no current app')
      t.strictEqual(life.scheduler.isAppRunning('1'), true, 'shall be running')
      t.strictEqual(life.isAppInactive('1'), true, 'shall be inactive once created')
      t.strictEqual(life.isAppInStack('1'), false, 'shall not be in stack once created')
      return life.activateAppById('1')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'should be top of stack on activated')
      t.deepEqual(life.activitiesStack, [ '1' ])
      t.strictEqual(life.scheduler.isAppRunning('1'), true, 'should be running after activated')
      t.strictEqual(life.isAppInStack('1'), true, 'should be in stack on activated')
      t.strictEqual(life.isAppInactive('1'), false, 'should not be inactive on activated')
      return life.deactivateAppById('1')
    })
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), undefined, 'should have no current app')
      t.deepEqual(life.activitiesStack, [])
      t.strictEqual(life.scheduler.isAppRunning('1'), false, 'deactivating shall destroy the app')
      t.strictEqual(life.isAppInStack('1'), false)
      t.strictEqual(life.isAppInactive('1'), false, 'deactivating shall destroy the app')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
