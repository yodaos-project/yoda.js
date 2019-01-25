var test = require('tape')

var helper = require('../../helper')
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)
var mock = require('./mock')

test('shall throw on life cycle if app is not alive', t => {
  mock.restore()
  t.plan(2)

  mock.mockAppExecutors(3)
  var life = new Lifetime(mock.runtime)

  t.doesNotThrow(() => {
    life.onLifeCycle('1', 'ready')
      .then(ret => {
        t.fail('not reachable path')
      })
      .catch(err => {
        t.throws(() => { throw err }, 'Trying to send life cycle')
      })
  })
})
