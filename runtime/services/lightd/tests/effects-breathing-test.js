var light = require('@yoda/light')
var LightRenderingContextManager = require('../effects')

var manager = new LightRenderingContextManager()

var context = manager.getContext()
context._getCurrentId = function () {
  return context._id
}

var c = false

function render () {
  context.breathing(255, 255, 255, 1000, 60, (r, g, b) => {
    if (c) {
      light.fill(0, 0, 0)
      light.pixel(4, r, g, b)
    } else {
      light.fill(r, g, b)
      light.pixel(4)
    }
    light.write()
  }).then(() => {
    c = !c
    render()
  })
}
render()
