var LightRenderingContextManager = require('/usr/yoda/services/lightd/effects')
var test = require('tape')
var effect = new LightRenderingContextManager()
var context = effect.getContext()

test('breathing should be work', t => {
  context._getCurrentId = function () {
    return 0
  }
  context.breathing(255, 0, 255, 3000, 30, (r, g, b, lastFrame) => {
    context.fill(r, g, b)
    context.render()
  })
  t.end()
})
