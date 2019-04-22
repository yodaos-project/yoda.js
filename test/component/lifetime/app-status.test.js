var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('daemon app status', t => {
  mock.restore()
  mock.mockAppExecutors(1)
  mock.mockAppExecutors(1, true, 1)
  var life = new Lifetime(mock.runtime)

  life.createApp('1')
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), undefined, 'should have no current app')
      t.strictEqual(life.scheduler.isAppRunning('1'), true, 'app shall be running on created')
      t.strictEqual(life.isAppInStack('1'), false)
      t.strictEqual(life.isAppInactive('1'), true, 'daemon app shall be inactive on created')
      t.strictEqual(life.isBackgroundApp('1'), false)
      return life.activateAppById('1')
    })
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), '1', 'should be current app')
      t.strictEqual(life.activeSlots.cut, '1', 'app shall occupy cut slot')
      t.strictEqual(life.scheduler.isAppRunning('1'), true)
      t.strictEqual(life.isAppInStack('1'), true, 'app shall be top of stack on activated')
      t.strictEqual(life.isAppInactive('1'), false)
      t.strictEqual(life.isBackgroundApp('1'), false)
      return life.deactivateAppById('1')
    })
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), undefined, 'should have no current app')
      t.looseEqual(life.activeSlots.cut, null, 'app shall not occupy cut slot')
      t.strictEqual(life.scheduler.isAppRunning('1'), true)
      t.strictEqual(life.isAppInStack('1'), false)
      t.strictEqual(life.isAppInactive('1'), true, 'daemon app shall be inactive on deactivated')
      t.strictEqual(life.isBackgroundApp('1'), false, 'daemon app shall not be in background on deactivated')
      return life.activateAppById('1').then(() => life.setBackgroundById('1'))
    })
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), undefined, 'should have no current app')
      t.looseEqual(life.activeSlots.cut, null, 'app shall not occupy cut slot')
      t.strictEqual(life.scheduler.isAppRunning('1'), true)
      t.strictEqual(life.isAppInStack('1'), false)
      t.strictEqual(life.isAppInactive('1'), false)
      t.strictEqual(life.isBackgroundApp('1'), true, 'app shall be in background on set background')
      return life.destroyAppById('1')
    })
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), undefined, 'should have no current app')
      t.looseEqual(life.activeSlots.cut, null, 'app shall not occupy cut slot')
      t.strictEqual(life.scheduler.isAppRunning('1'), true, 'daemon app shall be running on soft destroyed')
      t.strictEqual(life.isAppInStack('1'), false)
      t.strictEqual(life.isAppInactive('1'), true, 'daemon app shall be inactive on soft destroyed')
      t.strictEqual(life.isBackgroundApp('1'), false, 'daemon app shall not be in background on soft destroyed')
      return life.destroyAppById('1', { force: true })
    })
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), undefined, 'should have no current app')
      t.looseEqual(life.activeSlots.cut, null, 'app shall not occupy cut slot')
      t.strictEqual(life.scheduler.isAppRunning('1'), false, 'daemon app shall be running on force destroyed')
      t.strictEqual(life.isAppInStack('1'), false)
      t.strictEqual(life.isAppInactive('1'), false)
      t.strictEqual(life.isBackgroundApp('1'), false)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('non-daemon app status', t => {
  mock.restore()

  mock.mockAppExecutors(5)
  var life = new Lifetime(mock.runtime)

  life.createApp('1')
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), undefined, 'should have no current app')
      t.strictEqual(life.scheduler.isAppRunning('1'), true, 'shall be running')
      t.strictEqual(life.isAppInactive('1'), true, 'shall be inactive once created')
      t.strictEqual(life.isAppInStack('1'), false, 'shall not be in stack once created')
      t.strictEqual(life.isBackgroundApp('1'), false, 'should not be background app once created')
      return life.activateAppById('1')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'should be top of stack on activated')
      t.strictEqual(life.activeSlots.cut, '1', 'app shall occupy cut slot')
      t.strictEqual(life.scheduler.isAppRunning('1'), true, 'should be running after activated')
      t.strictEqual(life.isAppInStack('1'), true, 'should be in stack on activated')
      t.strictEqual(life.isAppInactive('1'), false, 'should not be inactive on activated')
      t.strictEqual(life.isBackgroundApp('1'), false, 'should not be background app on activated')
      t.deepEqual(life.getContextOptionsById('1'), { form: 'cut' })
      return life.deactivateAppById('1')
    })
    .then(() => {
      t.looseEqual(life.getCurrentAppId(), undefined, 'should have no current app')
      t.looseEqual(life.activeSlots.cut, null, 'app shall not occupy cut slot')
      t.strictEqual(life.scheduler.isAppRunning('1'), false, 'app is not daemon, deactivating shall destroy it')
      t.strictEqual(life.isAppInStack('1'), false)
      t.strictEqual(life.isAppInactive('1'), false, 'app is not daemon, deactivating shall destroy it')
      t.strictEqual(life.isBackgroundApp('1'), false)

      return life.createApp('1')
        .then(() => life.activateAppById('1'))
        .then(() => life.setBackgroundById('1'))
    })
    .then(() => {
      t.looseEqual(life.activeSlots.cut, null, 'app shall not occupy cut slot')
      t.strictEqual(life.scheduler.isAppRunning('1'), true, 'shall be running on set background')
      t.strictEqual(life.isAppInStack('1'), false)
      t.strictEqual(life.isAppInactive('1'), false)
      t.strictEqual(life.isBackgroundApp('1'), true, 'normal app shall be in background on set background')
      return life.destroyAppById('1')
    })
    .then(() => {
      t.looseEqual(life.activeSlots.cut, null, 'app shall not occupy cut slot')
      t.strictEqual(life.scheduler.isAppRunning('1'), false, 'app shall be not be running on soft destroyed')
      t.strictEqual(life.isAppInStack('1'), false)
      t.strictEqual(life.isAppInactive('1'), false)
      t.strictEqual(life.isBackgroundApp('1'), false)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should get app data by id', t => {
  mock.restore()

  mock.mockAppExecutors(5)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(5).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return _.mapSeries(_.times(5), idx =>
        life.activateAppById(`${idx}`)
          .then(() => {
            t.deepEqual(life.getContextOptionsById(`${idx}`), { form: 'cut' })
          })
      )
    })
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
