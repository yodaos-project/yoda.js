'use strict'

module.exports = function awake (light, data, callback) {
  var base = 120
  var adjustable = 135
  var final
  var render = function () {
    final = base + Math.floor(Math.random() * adjustable)
    light.fill(final, final, final)
    light.render()
    light.requestAnimationFrame(() => {
      render()
    }, 45)
  }
  render()
  callback && callback()
  return {
    stop: function (keep) {
      light.stop(keep)
    }
  }
}
