'use strict'

module.exports = function (light, data, callback) {
  if (data.plug && data.plug === true) {
    light.sound('system://power_plug.ogg')
  } else {
    light.sound('system://power_pull.ogg')
  }
}
