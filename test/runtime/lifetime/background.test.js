var test = require('tape')
var _ = require('@yoda/util')._

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('set background recovers previous active app if target app is top of stack', t => {
  mock.restore()

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  Promise.all(_.times(3).map(idx => life.createApp(`${idx}`)))
    .then(() => {
      return life.setBackgroundById('1')
    })
    .then(() => {
      t.strictEqual(life.isBackgroundApp('1'), true, 'app shall be in background')
      return life.setBackgroundById('2')
    })
    .then(() => {
      t.strictEqual(life.isBackgroundApp('2'), true, 'app shall be in background')
      t.looseEqual(life.getCurrentAppId(), null, 'no current app shall exists')
      return life.setForegroundById('1', 'scene')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'app shall be switched to foreground')
      return life.setForegroundById('2')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '2', 'app shall be switched to foreground')
      t.strictEqual(life.isAppInStack('1'), true, 'scene app shall be alive on preemption')

      return life.setBackgroundById('2')
    })
    .then(() => {
      t.strictEqual(life.getCurrentAppId(), '1', 'scene app shall be activated on abdication')

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
