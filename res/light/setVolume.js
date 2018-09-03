'use strict'

module.exports = function (light, data, callback) {
  var pos = Math.floor((data.volume / 100) * light.ledsConfig.leds)
  light.clear()
  var player = light.sound('system://volume.wav')

  light.transition({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }, 720, 18, (r, g, b, lastFrame) => {
    for (var i = 0; i < pos; i++) {
      light.pixel(i, r, g, b)
    }
    light.render()
    if (lastFrame) {
      callback()
    }
  })

  return {
    stop: function () {
      callback()
      player.stop()
      light.stop()
    }
  }
}
