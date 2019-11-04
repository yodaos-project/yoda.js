'use strict'

module.exports = function (light, data, callback) {
  var muted = !!(data && data.muted)
  light.clear()

  if (!muted) {
    light.sound('system://mic_enable.ogg')
    light.render()
    callback()
  } else {
    light.sound('system://mic_close_tts.ogg')
    light.fill(255, 0, 0)
    light.render()
  }
}
