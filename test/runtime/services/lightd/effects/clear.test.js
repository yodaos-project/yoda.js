
var LightRenderingContextManager = require('/usr/yoda/services/lightd/effects')
var test = require('tape')
var effect = new LightRenderingContextManager()

test('clear should be work', t => {
  var context = effect.getContext()
  context._getCurrentId = function () {
    return 0
  }
  context.fill(255, 255, 0, 1)
  context.render()
  setTimeout(() => {
    context.clear()
    context.render()
    t.end()
  }, 5000)
})
