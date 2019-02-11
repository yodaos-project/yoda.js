var LightRenderingContextManager = require('/usr/yoda/services/lightd/effects')
var test = require('tape')
var effect = new LightRenderingContextManager()

test('sound should be work', t => {
  // t.plan(0)
  var context = effect.getContext()
  context._getCurrentId = function () {
    return 0
  }
  context.sound('system://wakeup.ogg', 'self')
  setTimeout(() => {
    context.stop()
    t.end()
  }, 5000)
})
