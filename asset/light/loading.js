'use strict'

module.exports = function loading (light, data, callback) {
  var pos = 0
  var leds = light.ledsConfig.leds
  if (data.degree) {
    pos = Math.floor((data.degree / 360) * leds)
  }
  var render = function () {
    light.fill(30, 30, 150)
    pos = pos === (leds - 1) ? 0 : pos + 1
    light.pixel(pos, 255, 255, 255)
    light.render()
    light.requestAnimationFrame(() => {
      render()
    }, 60)
  }
  render()
  light.requestAnimationFrame(() => {
    callback()
    light.stop()
  }, 6000)

  return {
    stop: function () {
      callback()
      light.stop()
    }
  }
}
