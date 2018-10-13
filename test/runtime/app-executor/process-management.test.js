var test = require('tape')
var path = require('path')

var helper = require('../../helper')
var Executor = require(`${helper.paths.runtime}/lib/app/executor`)

var target = path.join(helper.paths.fixture, 'ext-app')
var runtime = {
  appGC: function () {}
}

test('shall create child process', t => {
  t.plan(5)
  var executor = new Executor({
    metadata: {
      extapp: true
    }
  }, target, '@test', runtime)
  t.strictEqual(executor.creating, false)
  var promise = executor.create()
  t.strictEqual(executor.creating, true)
  promise
    .then(app => {
      t.notLooseEqual(executor.app, null)
      t.strictEqual(executor.creating, false)
      app.once('exit', () => {
        t.looseEqual(executor.app, null)
      })
      executor.destruct()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
