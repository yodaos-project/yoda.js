var LightRenderingContextManager = require('/usr/yoda/services/lightd/effects')
var test = require('tape')
var effect = new LightRenderingContextManager()
var context = effect.getContext()
test('transition should be work ', t => {
  // t.plan(0)
  context._getCurrentId = function () {
    return 0
  }
  context.transition({r: 255, g: 0, b: 0}, {r: 0, g: 0, b: 255}, 3000, 30, (r, g, b, lastFrame) => {
    context.fill(r, g, b)
    context.render()
    context.clear()
  })
  t.end()
})
