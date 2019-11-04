'use strict'

module.exports = function (light, data, callback) {
  var R = 60
  var G = 180
  var B = 255
  var count = 1
  light.sound('system://shutdown.ogg')
  var render = function (r, g, b, last) {
    light.fill(r, g, b)
    light.render()
  }
  var loop = function () {
    light.transition({r: R, g: G, b: B}, {r: 255, g: 255, b: 255}, 180, 60, render).then(() => {
      light.transition({r: 255, g: 255, b: 255}, {r: R, g: G, b: B}, 180, 60, render).then(() => {
        if (count > 0) {
          count--
          loop()
        } else if (count === 0) {
          light.fill(R, G, B)
          light.requestAnimationFrame(callback, 1000)
        }
      })
    })
  }
  loop()
}
