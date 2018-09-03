'use strict'

module.exports = function awake (light, data, callback) {
  var end = false
  function delayAndShutdown () {
    light.requestAnimationFrame(() => {
      light.transition({ r: 0, g: 0, b: 150 }, { r: 0, g: 0, b: 0 }, 130, 4, (r, g, b, lastFrame) => {
        light.fill(r, g, b)
        light.render()
        if (lastFrame) {
          end = true
          callback()
        }
      })
    }, 6000)
  }

  light.transition({ r: 0, g: 0, b: 0 }, { r: 0, g: 0, b: 150 }, 130, 4, (r, g, b, lastFrame) => {
    light.fill(r, g, b)
    light.render()
    if (lastFrame) {
      delayAndShutdown()
    }
  })

  var player

  return {
    setDegree: function (degree) {
      if (!end) {
        callback()
        player = light.sound('system://wakeup.ogg')
        light.stop(true)
        light.fill(0, 0, 150)
        var pos = Math.floor((degree / 360) * light.ledsConfig.leds)
        light.pixel(pos, 255, 255, 255)
        light.render()
        delayAndShutdown()
      }
    },
    stop: function (keep) {
      player && player.pause()
      light.stop(keep)
    }
  }
}
