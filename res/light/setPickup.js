module.exports = function (light, data, callback) {
  var called = false
  function delayANDshutdown () {
    light.requestAnimationFrame(() => {
      light.transition({ r: 0, g: 0, b: 150 }, { r: 0, g: 0, b: 0 }, 130, 4, () => {
        called = true
        callback && callback()
      })
    }, data.duration || 6000)
  }

  light.transition({ r: 0, g: 0, b: 0 }, { r: 0, g: 0, b: 150 }, 130, 4, () => {
    var pos = Math.floor((data.degree / 360) * light.ledsConfig.leds)
    light.pixel(pos, 255, 255, 255)
    light.render()
    delayANDshutdown()
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
