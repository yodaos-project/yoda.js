var test = require('tape')

var AppRuntime = require('../../helper/mock-runtime')

test('shall collect app interests on app exited', t => {
  t.plan(1)
  var runtime = new AppRuntime()
  var keyboard = runtime.component.keyboard

  keyboard.preventDefaults('foo', '123', [ 'click', 'keydown' ])
  keyboard.appDidExit('foo')
  t.strictEqual(keyboard.interests.foo, undefined)

  t.end()
})
