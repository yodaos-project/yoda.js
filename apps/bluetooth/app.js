'use strict'

var bluetooth = require('@yoda/bluetooth')
var logger = require('logger')('eventReq')
var property = require('@yoda/property')
var wifi = require('@yoda/wifi')
module.exports = function (activity) {
  var player = null
  var uuid = property.get('ro.boot.serialno') || ''
  var name = 'Rokid-Me-' + uuid.substr(-6)
  var bluetoothState = null
  var playState = null
  var STRING_BROADCAST = '蓝牙已打开，请使用手机搜索设备'
  var STRING_CONNECED = '已连接上你的'
  var STRING_CLOSED = '蓝牙已关闭'

  function broadcast () {
    if (player === null) { player = bluetooth.getPlayer() }
    setTimeout(() => {
      if (bluetoothState === null) {
        player.start(name)
      }
    }, 1000)
    player.on('stateupdate', function (message) {
      if ((message.a2dpstate === 'opened') && (message.connect_state === 'connected') && (message.play_state ===
        'invailed')) {
        bluetoothState = 'connected'
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          activity.setForeground().then(() => { speakAndExit(STRING_CONNECED + name) })
        } else {
          activity.setForeground().then(() => { mediaAndExit('system://connectbluetooth.ogg') })
        }
      } else if ((message.a2dpstate === 'opened') && (message.connect_state === 'invailed') && (message.play_state ===
        'invailed')) {
        bluetoothState = 'opened'
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          activity.setForeground().then(() => { speakAndExit(STRING_BROADCAST + name) })
        } else {
          activity.setForeground().then(() => { mediaAndExit('system://openbluetooth.ogg') })
        }
      } else if ((message.a2dpstate === 'opened') && (message.connect_state === 'disconnected') && (message.play_state ===
        'invailed')) {
        bluetoothState = 'disconnected'
        activity.setForeground().then(() => { mediaAndExit('system://closebluetooth.ogg') })
      }
    }
    )
  }

  function disconnect () {
    if (player) {
      player.end()
      player.disconnect()
      bluetoothState = null
    }
    activity.tts.speak(STRING_CLOSED)
      .then(() => {
        activity.exit()
      })
  }

  function startMusic () {
    player = bluetooth.getPlayer()
    if (player && (bluetoothState === 'connected')) {
      player.play()
      playState = true
    } else { activity.setForeground().then(() => { mediaAndExit('system://playbluetootherror.ogg') }) }
  }

  function pauseMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.pause()
    }
  }

  function resumeMusic () {
    if (player) {
      player.play()
    }
  }

  function nextMusic () {
    player = bluetooth.getPlayer()
    logger.log('bluetooth music is nextMusic')
    if (player) {
      player.next()
    }
  }

  function previousMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.prev()
    }
  }

  function speakAndExit (text) {
    return activity.tts.speak(text)
      .then(() => activity.setBackground())
  }

  function mediaAndExit (text) {
    return activity.playSound(text)
      .then(() => activity.setBackground())
  }
  activity.on('pause', () => {
    pauseMusic()
  })

  activity.on('resume', () => {
    if (playState) { resumeMusic() }
  })

  activity.on('destroy', () => {
    playState = false
    pauseMusic()
    player.end()
    activity.exit()
    speakAndExit(STRING_CLOSED)
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
        activity.openUrl(`yoda-skill://bluetooth/bluetooth_start_bluetooth_music`, 'scene')
        break
      case 'next':
        nextMusic()
        break
      case 'pre':
        previousMusic()
        break
      case 'stop':
        pauseMusic()
        break
      case 'resume':
        resumeMusic()
        break
      default:
        activity.exit()
        break
    }
  })

  activity.on('url', url => {
    switch (url.pathname) {
      case '/bluetooth_broadcast':
        broadcast()
        break
      case '/bluetooth_start_bluetooth_music':
        startMusic()
        break
    }
  })
}
