'use strict'

module.exports = function (light, data, callback) {
  var rand = Math.round(Math.random() * 2)
  var player = light.sound(`system://startup${rand}.ogg`)
  light.requestAnimationFrame(() => {
    light.transition({r: 0, g: 0, b: 0}, {r: 0, g: 0, b: 255}, 2400, 80, () => {
      light.requestAnimationFrame(() => {
        light.transition({r: 0, g: 0, b: 255}, {r: 0, g: 0, b: 0}, 1000, 30)
      }, 1000)
    })
  }, 1400)

  return {
    stop: function () {
      player.stop()
      light.stop()
    }
  }
}
