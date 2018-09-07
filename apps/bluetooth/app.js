'use strict'

var bluetooth = require('@yoda/bluetooth')
var logger = require('logger')('eventReq')
var property = require('@yoda/property')
module.exports = function (activity) {
  var player = null
  var start = null
  var uuid = property.get('ro.boot.serialno') || ''
  var name = 'Rokid-Me-' + uuid.substr(-6)
  var STRING_BROADCAST = '蓝牙已打开，请使用手机搜索设备'
  var STRING_CONNECED = '连接蓝牙成功'
  var STRING_CLOSED = '蓝牙已关闭'

  function broadcast () {
    player = bluetooth.getPlayer()
    setTimeout(() => {
      start = player.start(name)
      if (start) {
        speakAndExit(STRING_BROADCAST + name)
      }
    }, 1000)
    player.on('stateupdate', function (message) {
      if (message.connect_name && message.connect_state === 'connected') {
        activity.setForeground()
          .then(() => {
            speakAndExit(STRING_CONNECED)
          })
      }
    }
    )
  }

  function disconnect () {
    if (player) {
      player.end()
      player.disconnect()
    }
    activity.tts.speak(STRING_CLOSED)
      .then(() => {
        activity.exit()
      })
  }

  function startMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.play()
    }
  }

  function pauseMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.pause()
    }
  }
  /**
  function resumeMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.resume()
    }
  }

  function nextMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.next()
    }
  }

  function previousMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.previous()
    }
  }
  */

  function speakAndExit (text) {
    return activity.tts.speak(text)
      .then(() => activity.setBackground())
  }

  activity.on('pause', () => {
    pauseMusic()
  })
  activity.on('destroy', () => {
    pauseMusic()
    player.disconnect()
    activity.exit()
    speakAndExit(STRING_CLOSED)
  })

  activity.on('resume', () => {
    logger.log('bluetooth music is resume')
    startMusic()
  })

  activity.on('request', function (nlp, action) {
    switch (nlp.intent) {
      case 'bluetooth_broadcast':
        broadcast()
        break
      case 'bluetooth_disconnect':
        disconnect()
        break
      case 'play_bluetoothmusic':
        logger.log('play_bluetoothmusic music is startmusic')
        startMusic()
        break
        /* case 'next':
            nextMusic()
            break
          case 'previous':
            previousMusic()
            break
          case 'stop':
            pauseMusic()
            break
          case 'resume':
            resumeMusic()
            break */
      default:
        activity.exit()
        break
    }
  })
}
