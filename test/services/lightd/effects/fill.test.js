var LightRenderingContextManager = require('/usr/yoda/services/lightd/effects')
var test = require('tape')
var effect = new LightRenderingContextManager()

test('fill should be work', t => {
  // t.plan(0)
  var context = effect.getContext()
  context._getCurrentId = function () {
    return 0
  }
  context.fill(255, 255, 255, 1)
  context.render()
  context.requestAnimationFrame((cb) => {
    var context2 = effect.getContext()
    context2._getCurrentId = function () {
      return 1
    }
    context2.fill(255, 0, 255, 1)
    context2.render()
  }, 3000)
  setTimeout(() => {
    context.clear()
    context.render()
    t.end()
  }, 5000)
})
