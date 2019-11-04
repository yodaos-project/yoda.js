'use strict'

module.exports = function awake (light, data, callback) {
  var from = { r: 0, g: 0, b: 0 }
  var to = { r: 0, g: 0, b: 150 }

  if (data.degree !== undefined) {
    var pos = Math.floor((data.degree / 360) * light.ledsConfig.leds)
    light.fill(to.r, to.g, to.b)
    light.pixel(pos, 255, 255, 255)
    light.render()
    return {
      stop: () => light.stop(false)
    }
  } else {
    light.transition(from, to, 100, 15, (r, g, b, last) => {
      light.fill(r, g, b)
      light.render()
    })
    return {
      stop: () => light.stop(true)
    }
  }
}
