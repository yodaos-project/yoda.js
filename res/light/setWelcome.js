'use strict'

module.exports = function (light, data, callback) {
  var rand = Math.round(Math.random() * 2)
  var player = light.sound(`system://startup${rand}.ogg`)
  light.requestAnimationFrame(() => {
    light.transition({r: 0, g: 0, b: 0}, {r: 0, g: 0, b: 255}, 2400, 26, (r, g, b, lastFrame) => {
      light.fill(r, g, b)
      light.render()
      if (lastFrame) {
        light.requestAnimationFrame(() => {
          light.transition({r: 0, g: 0, b: 255}, {r: 0, g: 0, b: 0}, 1000, 26, (r, g, b, lastFrame) => {
            light.fill(r, g, b)
            light.render()
            if (lastFrame) {
              callback()
            }
          })
        }, 1000)
      }
    })
  }, 1400)

  return {
    stop: function () {
      callback()
      player.stop()
      light.stop()
    }
  }
}
