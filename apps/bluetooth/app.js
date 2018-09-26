'use strict'

var bluetooth = require('@yoda/bluetooth')
var logger = require('logger')('bluetooth')
var property = require('@yoda/property')
var wifi = require('@yoda/wifi')

module.exports = function (activity) {
  var player = null
  var uuid = property.get('ro.boot.serialno') || ''
  var name = ['Rokid',
    property.get('ro.rokid.build.productname') || 'Me',
    uuid.substr(-6)].join('-')

  var bluetoothState = null
  var OPENTIMEOUT = 60000
  var connectBlutoothName = null
  var playState = null
  var STRING_BROADCAST = '蓝牙已打开，请使用手机搜索设备'
  var STRING_CONNECED = '已连接上你的'
  var STRING_CONNECEDFAILED = '未能连接上你的'
  var STRING_CLOSED = '蓝牙已关闭'
  var BLUETOOTH_MUSIC_ID = 'RDDE53259D334860BA9E98CB3AB6C001'

  function broadcast () {
    player = bluetooth.getPlayer()
    setTimeout(() => {
      if ((bluetoothState === null) || (bluetoothState === 'disconnected')) {
        player.start(name)
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          activity.setForeground().then(() => { speakAndExit(STRING_BROADCAST + name) })
        } else {
          activity.setForeground().then(() => { mediaAndExit('system://openbluetooth.ogg') })
        }
        setTimeout(() => {
          if (!playState) {
            disconnect()
          }
        }, OPENTIMEOUT)
      } else if (bluetoothState === 'connected') {
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          activity.setForeground().then(() => { speakAndExit(STRING_CONNECED + connectBlutoothName) })
        } else {
          activity.setForeground().then(() => { mediaAndExit('system://connectbluetooth.ogg') })
        }
      }
    }, 1000)
    player.on('stateupdate', function (message) {
      logger.debug('stateupdate', message)
      if (message.play_state === 'played') {
        playState = true
        return activity.setForeground({ form: 'scene', skillId: BLUETOOTH_MUSIC_ID })
      }
      if (message.play_state === 'stoped') {
        playState = false
        setTimeout(() => { if (!playState) { disconnect() } }, OPENTIMEOUT)
      }
      if (bluetoothState === 'connected' && message.connect_state === 'disconnected') {
        bluetoothState = 'disconnected'
        return activity.setForeground().then(() => {
          return activity.playSound('system://closebluetooth.ogg')
        }).then(() => {
          return activity.exit()
        })
      }
      if ((message.a2dpstate === 'openfailed') && (message.connect_state === 'invailed') &&
      (message.play_state === 'invailed')) {
        activity.setForeground().then(() => {
          mediaAndExit('system://openbluetootherror.ogg')
        })
      }
      if ((message.a2dpstate === 'opened') && (message.connect_state === 'connected failed') &&
        (message.play_state === 'invailed')) {
        connectBlutoothName = message.connect_name
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          activity.setForeground().then(() => {
            speakAndExit(STRING_CONNECEDFAILED + message.connect_name)
          })
        } else {
          activity.setForeground().then(() => {
            mediaAndExit('system://connectfailedbluetooth.ogg')
          })
        }
      }
      if ((message.a2dpstate === 'opened') && (message.connect_state === 'connected') &&
        (message.play_state === 'invailed')) {
        bluetoothState = 'connected'
        connectBlutoothName = message.connect_name
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          activity.setForeground().then(() => {
            speakAndExit(STRING_CONNECED + message.connect_name)
          })
        } else {
          activity.setForeground().then(() => {
            mediaAndExit('system://connectbluetooth.ogg')
          })
        }
      }
    })
  }

  function disconnect () {
    if (player) {
      player.end()
      player.disconnect()
      bluetoothState = null
    }
    activity.setForeground().then(() => {
      speakAndExit(STRING_CLOSED)
    })
  }

  function startMusic () {
    activity.setForeground({ form: 'scene', skillId: BLUETOOTH_MUSIC_ID }).then(() => {
      player = bluetooth.getPlayer()
      if (player && bluetoothState === 'connected') {
        playState = true
        player.play()
      } else {
        mediaAndExit('system://playbluetootherror.ogg')
      }
    })
  }

  function pauseMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.pause()
    }
  }

  function resumeMusic () {
    player = bluetooth.getPlayer()
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
      .then(() => !playState && activity.setBackground())
  }

  function mediaAndExit (text) {
    return activity.playSound(text)
      .then(() => !playState && activity.setBackground())
  }

  activity.on('pause', () => {
    pauseMusic()
  })

  activity.on('resume', () => {
    if (playState) {
      resumeMusic()
    }
  })

  activity.on('destroy', () => {
    playState = false
    pauseMusic()
    player.end()
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
        activity.openUrl(`yoda-skill://bluetooth_music/bluetooth_start_bluetooth_music`, 'scene')
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
      case 'connect_phone':
        broadcast()
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
