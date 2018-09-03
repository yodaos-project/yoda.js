'use strict'

module.exports = function (light, data, callback) {
  var muted = !!(data && data.muted)
  var leds = light.ledsConfig.leds
  light.clear()
  var player

  if (!muted) {
    player = light.sound(`system://mic_enable.ogg`)
    light.render()
    return {
      stop: () => {
        callback()
        player.stop()
        light.stop()
      }
    }
  }

  player = light.sound('system://mic_close_tts.ogg')
  light.pixel(leds - 1, 255, 0, 0)
  light.render()
  callback()
  return {
    stop: () => {
      callback()
      player.stop()
      light.stop(true)
    }
  }
}
