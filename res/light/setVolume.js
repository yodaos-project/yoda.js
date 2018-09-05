'use strict'

module.exports = function (light, data, callback) {
  var pos = Math.floor((data.volume / 100) * light.ledsConfig.leds)
  pos = Math.max(1, pos)
  var player = light.sound('system://volume.wav')

  for (var i = 0; i < pos; i++) {
    light.pixel(i, 255, 255, 255)
  }
  light.render()
  callback()

  return {
    stop: function () {
      player.stop()
      light.stop()
    }
  }
}
