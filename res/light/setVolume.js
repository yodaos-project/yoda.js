'use strict'

module.exports = function (light, data, callback) {
  var pos = Math.floor((data.volume / 100) * light.ledsConfig.leds)
  pos = Math.max(1, pos)

  function delayAndShutdown () {
    light.requestAnimationFrame(() => {
      light.transition({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }, 130, 26, (r, g, b, lastFrame) => {
        for (var i = 0; i < pos; i++) {
          light.pixel(i, r, g, b)
        }
        light.render()
        if (lastFrame) {
          callback()
        }
      })
    }, 1000)
  }

  var player = light.sound('system://volume.wav')

  light.fill(0, 0, 0)
  for (var i = 0; i < pos; i++) {
    light.pixel(i, 255, 255, 255)
  }
  light.render()
  delayAndShutdown()

  callback()

  return {
    stop: function () {
      player.stop()
      light.stop(true)
    }
  }
}
