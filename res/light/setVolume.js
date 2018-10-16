'use strict'

module.exports = function (light, data, callback) {
  var pos = Math.floor((data.volume / 100) * light.ledsConfig.leds)
  pos = Math.max(1, pos)

  var from = { r: 255, g: 255, b: 255 }
  var to = { r: 0, g: 0, b: 0 }

  function render (r, g, b) {
    for (var i = 0; i < pos; i++) {
      light.pixel(i, r, g, b)
    }
    light.render()
  }

  light.sound('system://volume.wav')
  light.fill(0, 0, 0)

  render(from.r, from.g, from.b)
  light.requestAnimationFrame(() => {
    light.transition(from, to, 130, 26, render)
      .then(callback)
  })
}
