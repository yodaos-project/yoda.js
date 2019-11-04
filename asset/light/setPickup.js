module.exports = function (light, data, callback) {
  var called = false
  function delayANDshutdown () {
    light.requestAnimationFrame(() => {
      light.transition({ r: 0, g: 0, b: 150 }, { r: 0, g: 0, b: 0 }, 130, 26, (r, g, b, lastFrame) => {
        light.fill(r, g, b)
        light.render()
        if (lastFrame) {
          called = true
          callback && callback()
        }
      })
    }, data.duration || 6000)
  }

  light.transition({ r: 0, g: 0, b: 0 }, { r: 0, g: 0, b: 150 }, 130, 26, (r, g, b, lastFrame) => {
    light.fill(r, g, b)
    var pos = Math.floor((data.degree / 360) * light.ledsConfig.leds)
    light.pixel(pos, 255, 255, 255)
    light.render()
    if (lastFrame) {
      delayANDshutdown()
    }
  })

  return {
    stop: function (keep) {
      light.stop(keep)
      if (called === false) {
        callback && callback()
      }
    }
  }
}
