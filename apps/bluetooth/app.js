'use strict'

var bluetooth = require('bluetooth')

module.exports = function (activity) {
  var agent = null
  var player = null
  var name = 'Rokid-Me-072'
  var STRING_BROADCAST = '蓝牙已打开，请使用手机搜索设备'
  var STRING_CLOSED = '蓝牙已关闭'

  function broadcast () {
    speakAndExit(STRING_BROADCAST + name)
    if (agent === null) {
      agent = bluetooth.getBluetooth(name)
    }
    if (player === null) {
      player = agent.createPlayer()
      player.on('open', () => {
        // auto play when open
        player.play()
      })
    }
  }

  function disconnect () {
    speakAndExit(STRING_CLOSED)
    if (agent) {
      // TODO
      agent = null
      player = null
    }
  }

  function speakAndExit (text) {
    return activity.tts.speak(text, () => {
      activity.exit()
    })
  }

  activity.on('onrequest', function (nlp, action) {
    switch (nlp.intent) {
      case 'bluetooth_broadcast':
        broadcast()
        break
      case 'bluetooth_disconnect':
        disconnect()
        break
      default:
        activity.exit()
        break
    }
  })
}
