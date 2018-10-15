'use strict'

module.exports = function setStandby (light, data, callback) {
  var leds = light.ledsConfig.leds
  var repeat = 0
  var index = 0
  if (leds % 4 !== 0) {
    console.log('NOTICE: the number of LEDs is not a multiple of 4')
    repeat = Math.floor(leds / 4)
  } else {
    repeat = Math.floor(leds / 4)
  }
  var circle = function () {
    light.breathing(255, 50, 0, 1100, 26, (r, g, b, lastFrame) => {
      light.clear()
      if (repeat <= 0) {
        console.log('NOTICE: LED number is less then 4, what you see may not be the effect you want')
        light.fill(r, g, b)
      } else {
        light.pixel(index + repeat * 0, r, g, b)
        light.pixel(index + repeat * 1, r, g, b)
        light.pixel(index + repeat * 2, r, g, b)
        light.pixel(index + repeat * 3, r, g, b)
      }
      light.render()
      if (lastFrame) {
        index++
        if (index >= repeat) {
          index = 0
        }
        light.requestAnimationFrame(() => {
          circle()
        }, 100)
      }
    })
  }
  circle()

  if (typeof callback === 'function') {
    callback()
  }
  return function stop (keep) {
    player.stop()
    light.stop(keep)
  }
}
