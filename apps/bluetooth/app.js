'use strict'

var bluetooth = require('@yoda/bluetooth')
var logger = require('logger')('bluetooth')
var property = require('@yoda/property')
var wifi = require('@yoda/wifi')

module.exports = function (activity) {
  var player = null
  var uuid = (property.get('ro.boot.serialno') || '').substr(-6)
  var productName = property.get('ro.rokid.build.productname') || 'Rokid-Me'
  var name = [ productName, uuid ].join('-')
  var nameToSpeak = [ productName, `<num=tel>${uuid}</num>` ].join('')

  var bluetoothState = null
  var bluetoothPlayState = null
  var connectBlutoothName = null
  var playState = null
  var STRING_BROADCAST = '蓝牙已打开'
  var STRING_CONNECT_MOBILE = '当前没有可连接的设备'
  var STRING_OPEN_BEGIN = '你可以在手机上找到'
  var STRING_OPEN_END = '来连接我的蓝牙'
  var STRING_CONNECT_MOBILE_END = '并进行连接'
  var STRING_CONNECED = '已连接上你的'
  var STRING_CONNECEDFAILED = '未能连接上你的'
  var DEVICE_NAME = '蓝牙设备'
  var STRING_OPENFAILED = '打开蓝牙失败'
  var STRING_OPENDISCONNECT = '蓝牙断开连接'
  var STRING_ASK = '你可以对我说，若琪，打开蓝牙'
  var BLUETOOTH_MUSIC_ID = 'RDDE53259D334860BA9E98CB3AB6C001'

  function broadcast (broadcastState) {
    player = bluetooth.getPlayer()
    setTimeout(() => {
      if ((bluetoothState === null) || (bluetoothState === 'closed')) {
        player.start(name)
        activity.light.play('system://bluetoothOpen.js', {}, { shouldResume: true }).catch((err) => {
          logger.error('bluetooth music light play', err)
        })
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          activity.setForeground().then(() => { speak(STRING_BROADCAST) })
        } else {
          activity.setForeground().then(() => { mediaAndExit('system://openbluetooth.ogg') })
        }
      } else if (bluetoothState === 'connected') {
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          activity.setForeground().then(() => { speak(STRING_CONNECED + connectBlutoothName) })
        } else {
          activity.setForeground().then(() => { mediaAndExit('system://connectbluetooth.ogg') })
        }
      }
    }, 1000)
    player.on('stateupdate', function (message) {
      logger.debug('stateupdate', message)
      if (message.play_state === 'played') {
        playState = true
      }
      if (message.a2dpstate === 'closed') {
        bluetoothState = 'closed'
        activity.light.stop('system://bluetoothOpen.js')
        activity.setForeground().then(() => {
          mediaAndExit('system://closebluetooth.ogg')
        })
      }
      if (message.connect_state === 'disconnected') {
        bluetoothState = 'disconnected'
        activity.setForeground().then(() => {
          speakAndExit(STRING_OPENDISCONNECT)
        })
      }
      if ((message.a2dpstate === 'openfailed') && (message.connect_state === 'invailed') &&
      (message.play_state === 'invailed')) {
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          activity.setForeground().then(() => {
            speakAndExit(STRING_OPENFAILED)
          })
        } else {
          activity.setForeground().then(() => {
            mediaAndExit('system://openbluetootherror.ogg')
          })
        }
      }
      if ((message.a2dpstate === 'opened') && (message.connect_state === 'invailed') &&
      (message.play_state === 'invailed') && (message.linknum === 0)) {
        if (broadcastState === 'connectMoblie') {
          activity.setForeground().then(() => { speak(STRING_CONNECT_MOBILE + STRING_OPEN_BEGIN + nameToSpeak + STRING_CONNECT_MOBILE_END) })
        } else {
          setTimeout(() => { activity.setForeground().then(() => { speak(STRING_OPEN_BEGIN + nameToSpeak + STRING_OPEN_END) }) }
            , 1000)
        }// Temporary delay 3s, in order to Preventing TTS broadcast loss.
      }
      if ((message.a2dpstate === 'opened') && (message.connect_state === 'connected failed') &&
        (message.play_state === 'invailed')) {
        connectBlutoothName = message.connect_name
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          if (message.connect_name === 'undefined') {
            activity.setForeground().then(() => {
              speakAndExit(STRING_CONNECEDFAILED + DEVICE_NAME)
            })
          } else {
            activity.setForeground().then(() => {
              speakAndExit(STRING_CONNECEDFAILED + message.connect_name)
            })
          }
        } else {
          activity.setForeground().then(() => {
            mediaAndExit('system://connectfailedbluetooth.ogg')
          })
        }
      }
      if ((message.a2dpstate === 'opened') && (message.connect_state === 'connected') &&
        (message.play_state === 'invailed')) {
        bluetoothState = 'connected'
        activity.light.stop('system://bluetoothOpen.js')
        connectBlutoothName = message.connect_name
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          setTimeout(() => {
            activity.setForeground().then(() => {
              speak(STRING_CONNECED + message.connect_name)
            })
          }, 1000)// Temporary delay 1s, in order to prevent TTS synchronization play will burst.
        } else {
          activity.setForeground().then(() => {
            mediaAndExit('system://connectbluetooth.ogg')
          })
        }
        return activity.setForeground({ form: 'scene', skillId: BLUETOOTH_MUSIC_ID })
      }
    })
  }

  function disconnect () {
    if (bluetoothState === 'closed') {
      return activity.setForeground().then(() => {
        mediaAndExit('system://closebluetooth.ogg')
      })
    }
    if (player) {
      player.end()
      player.disconnect()
      bluetoothState = null
    }
    activity.light.stop('system://bluetoothOpen.js')
    activity.setForeground().then(() => {
      mediaAndExit('system://closebluetooth.ogg')
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
    return activity.tts.speak(text).catch((err) => {
      logger.error('bluetooth music tts error', err)
    }).then(() => !playState && activity.setBackground())
  }

  function speak (text) {
    return activity.tts.speak(text).catch((err) => {
      logger.error('bluetooth music tts error', err)
    })
  }

  function mediaAndExit (text) {
    return activity.media.start(text, { streamType: 'alarm' })
      .then(() => !playState && activity.setBackground())
  }

  activity.on('pause', () => {
    bluetoothPlayState = 'play'
    pauseMusic()
  })

  activity.on('resume', () => {
    if (playState && (bluetoothPlayState === 'play')) { resumeMusic() }
  })

  activity.on('destroy', () => {
    playState = false
    bluetoothPlayState = 'pause'
    pauseMusic()
    player.end()
  })

  activity.on('request', function (nlp, action) {
    switch (nlp.intent) {
      case 'ask_bluetooth':
        speakAndExit(STRING_ASK)
        break
      case 'bluetooth_broadcast':
        broadcast('bluetooth_broadcast')
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
      case 'stop' :
        bluetoothPlayState = 'pause'
        pauseMusic()
        break
      case 'resume':
        resumeMusic()
        break
      case 'connect_phone':
        broadcast('connectMoblie')
        break
      default:
        activity.exit()
        break
    }
  })

  activity.on('url', url => {
    switch (url.pathname) {
      case '/bluetooth_broadcast':
        broadcast('bluetooth_broadcast')
        break
      case '/bluetooth_start_bluetooth_music':
        if (bluetoothState !== 'connected') {
          broadcast('connectMoblie')
          setTimeout(() => { startMusic() }, 2000)
        } else { startMusic() }
        break
    }
  })
}
