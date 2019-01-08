var path = require('path')

module.exports = function (light, data, callback) {
  var appMediaPath = path.join(__dirname, '..', 'media')
  if (data.isAcConnected) {
    light.sound('self://res/battery_connect.ogg', appMediaPath, { ignore: false })
  } else {
    light.sound('self://res/battery_disconnect.ogg', appMediaPath, { ignore: false })
  }
  light.requestAnimationFrame(callback, 1500)
}
