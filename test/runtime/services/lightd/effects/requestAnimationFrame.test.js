var LightRenderingContextManager = require('/usr/yoda/services/lightd/effects')
var test = require('tape')
var effect = new LightRenderingContextManager()

test('requestAnimationFrame should be work', t => {
  var context = effect.getContext()
  context._getCurrentId = function () {
    return 0
  }
  context.fill(255, 255, 255, 1)
  context.render()
  context.requestAnimationFrame((cb) => {
    var context1 = effect.getContext()
    context1._getCurrentId = function () {
      return 1
    }
    context1.fill(255, 0, 255, 1)
    context1.render()
  }, 7000)
  setTimeout(() => {
    context.stop()
    t.end()
  }, 3000)
})
