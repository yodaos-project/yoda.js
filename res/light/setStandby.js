'use strict'

module.exports = function setStandby (light, data, callback) {
  var index = 0
  var circle = function () {
    light.breathing(index, 255, 50, 0, 1100, 12, () => {
      index = index === 2 ? 0 : index + 1
      light.requestAnimationFrame(() => {
        circle()
      }, 80)
    })
  }
  var player = light.sound('system://wifi/setup_network.ogg')
  circle()

  if (typeof callback === 'function') {
    callback()
  }
  return function stop (keep) {
    player.stop()
    light.stop(keep)
  }
}
