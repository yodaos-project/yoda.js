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
  var isActivityPause = false
  var STRING_BROADCAST = '蓝牙已打开'
  var STRING_CONNECT_MOBILE = '当前没有可连接的设备'
  var STRING_OPEN_BEGIN = '你可以在手机上找到'
  var STRING_OPEN_END = '来连接我的蓝牙'
  var STRING_CONNECT_MOBILE_END = '并进行连接'
  var STRING_CONNECED = '已连接上你的'
  var STRING_CONNECEDFAILED = '未能连接上你的'
  var STRING_OPENFAILED = '打开蓝牙失败'
  var STRING_OPENDISCONNECT = '蓝牙断开连接'
  var STRING_ASK = '你可以对我说，若琪，打开蓝牙'
  var STRING_DISCONNECT = '当前并没有连接你的蓝牙设备'
  var STRING_DISCONNECT_LINK = '已断开你的蓝牙设备'
  var BLUETOOTH_MUSIC_ID = 'RDDE53259D334860BA9E98CB3AB6C001'

  function broadcast (broadcastStateBy, stateCallback) {
    if (typeof stateCallback !== 'function') {
      stateCallback = function noop () {}
    }
    player = bluetooth.getPlayer()
    if (bluetoothState === null || bluetoothState === 'closed') {
      player.start(name, true, (err) => {
        if (err) {
          if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
            speakAndBackground(STRING_OPENFAILED)
          } else {
            mediaAndBackground('system://openbluetootherror.ogg')
          }
          bluetoothState = 'closed'
          logger.log('open sink failed, name', name)
        } else {
          bluetoothState = 'opening'
          logger.log('open sink success, name', name)
        }
      })
      activity.light.play('system://bluetoothOpen.js', {}, { shouldResume: true }).catch((err) => {
        logger.error('bluetooth music light play', err)
      })
    } else if (bluetoothState === 'connected' || bluetoothState === 'stoped' || bluetoothState ===
      'played') {
      if (broadcastStateBy === 'connectPhone') {
        process.nextTick(() => stateCallback(bluetoothState))
      }
      mediaAndSpeak(STRING_CONNECED + connectBlutoothName, 'system://connectbluetooth.ogg')
    } else if (bluetoothState === 'disconnected') {
      mediaAndSpeak(STRING_BROADCAST + STRING_OPEN_BEGIN + nameToSpeak +
         STRING_OPEN_END, 'system://openbluetooth.ogg')
    }
    if (bluetoothState === null || bluetoothState === 'closed') {
      player.on('stateupdate', function (message) {
        logger.debug('stateupdate', message)
        if (message.play_state === 'played') {
          playState = true
          bluetoothState = 'played'
          activity.setForeground({ form: 'scene', skillId: BLUETOOTH_MUSIC_ID })
        }
        if (message.play_state === 'stoped') {
          bluetoothState = 'stoped'
          if (!isActivityPause) {
            playState = false
            activity.setBackground()
          }
        }
        if (message.a2dpstate === 'closed') {
          bluetoothState = 'closed'
        }
        if (message.connect_state === 'disconnected') {
          bluetoothState = 'disconnected'
          activity.setForeground().then(() => {
            speakAndBackground(STRING_OPENDISCONNECT)
          })
        }
        if (message.a2dpstate === 'opened' && message.connect_state === 'invalid' &&
            message.play_state === 'invalid') {
          bluetoothState = 'opened'
          if (message.linknum === 0) {
            process.nextTick(() => stateCallback(bluetoothState))
            if (wifi.getWifiState() !== wifi.WIFI_CONNECTED) {
              activity.setForeground().then(() => {
                mediaAndBackground('system://openbluetooth.ogg')
              })
            } else {
              if (broadcastStateBy === 'connectPhone') {
                activity.setForeground().then(() => {
                  speakAndBackground(STRING_BROADCAST + STRING_CONNECT_MOBILE + STRING_OPEN_BEGIN +
                  nameToSpeak + STRING_CONNECT_MOBILE_END)
                })
              } else {
                activity.setForeground().then(() => {
                  speakAndBackground(STRING_BROADCAST + STRING_OPEN_BEGIN + nameToSpeak +
                  STRING_OPEN_END)
                })
              }
            }
          } else {
            activity.setForeground().then(() => {
              mediaAndBackground('system://openbluetooth.ogg')
            })
          }
        }
        if (message.a2dpstate === 'openfailed' && message.connect_state === 'invalid' &&
            message.play_state === 'invalid') {
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
        if (message.a2dpstate === 'opened' && message.connect_state === 'connected failed' &&
            message.play_state === 'invalid') {
          connectBlutoothName = message.connect_name
          mediaAndSpeak(STRING_CONNECEDFAILED, 'system://connectfailedbluetooth.ogg')
        }
        if (message.a2dpstate === 'opened' && message.connect_state === 'connected' &&
           message.play_state === 'invalid') {
          bluetoothState = 'connected'
          activity.light.stop('system://bluetoothOpen.js')
          connectBlutoothName = message.connect_name
          process.nextTick(() => stateCallback(bluetoothState))
          activity.setForeground().then(() => {
            mediaAndSpeak(STRING_CONNECED + message.connect_name, 'system://connectbluetooth.ogg')
          })
        }
      })
    }
  }

  function closebluetooth () {
    if (bluetoothState === 'closed') {
      return activity.setForeground().then(() => {
        activity.media.start('system://closebluetooth.ogg', { streamType: 'playback' })
          .then(() => activity.exit({ clearContext: true }))
      })
    }
    if (player) {
      player.end()
      bluetoothState = null
      playState = false
    }
    activity.light.stop('system://bluetoothOpen.js')
    activity.setForeground().then(() => {
      activity.media.start('system://closebluetooth.ogg', { streamType: 'playback' })
        .then(() => activity.exit({ clearContext: true }))
    })
  }

  function disconnect () {
    if (bluetoothState === 'closed' || bluetoothState === 'disconnect') {
      return activity.setForeground().then(() => { speakAndBackground(STRING_DISCONNECT) })
    }
    if (player) {
      player.disconnect()
      bluetoothState = 'disconnect'
      playState = false
    }
    activity.setForeground().then(() => { speakAndBackground(STRING_DISCONNECT_LINK) })
  }

  function startMusic () {
    activity.setForeground({ form: 'scene', skillId: BLUETOOTH_MUSIC_ID }).then(() => {
      player = bluetooth.getPlayer()
      if (player && (bluetoothState === 'connected' || bluetoothState === 'stoped' ||
       bluetoothState === 'played')) {
        playState = true
        player.play()
        logger.log('bluetoothmusic start play !!!')
      } else {
        activity.media.start('system://playbluetootherror.ogg', { streamType: 'playback' })
          .then(() => !playState)
      }
    })
  }

  function pauseMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.pause()
      logger.log('bluetoothmusic start stop !!!')
    }
  }

  function resumeMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.play()
      logger.log('bluetoothmusic start play !!!')
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

  function speakAndBackground (text) {
    return activity.tts.speak(text).catch((err) => {
      logger.error('bluetooth music tts error', err)
    }).then(() => { if (bluetoothState === 'played')activity.setBackground() })
  }

  function speakAndExit (text) {
    return activity.tts.speak(text).catch((err) => {
      logger.error('bluetooth music tts error', err)
    }).then(() => !playState && activity.exit())
  }

  function mediaAndBackground (text) {
    return activity.media.start(text, { streamType: 'playback' })
      .then(() => { if (bluetoothState === 'played')activity.setBackground() })
  }

  function mediaAndSpeak (speakString, mediaString) {
    if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
      activity.setForeground().then(() => {
        speakAndBackground(speakString)
      })
    } else {
      activity.setForeground().then(() => { mediaAndBackground(mediaString) })
    }
  }

  function mediaAndExit (text) {
    return activity.media.start(text, { streamType: 'playback' })
      .then(() => !playState && activity.exit())
  }

  activity.on('pause', () => {
    if (bluetoothState === 'played') { bluetoothPlayState = 'play' }
    pauseMusic()
    isActivityPause = true
  })

  activity.on('resume', () => {
    isActivityPause = false
    if (playState && (bluetoothPlayState === 'play')) { resumeMusic() }
  })

  activity.on('destroy', () => {
    playState = false
    bluetoothState = 'closed'
    bluetoothPlayState = 'stop'
    pauseMusic()
    player.end()
    activity.light.stop('system://bluetoothOpen.js')
  })

  activity.on('request', function (nlp, action) {
    switch (nlp.intent) {
      case 'ask_bluetooth':
        speakAndBackground(STRING_ASK)
        break
      case 'bluetooth_broadcast':
        broadcast('bluetooth_broadcast')
        break
      case 'bluetooth_disconnect':
        closebluetooth()
        break
      case 'play_bluetoothmusic':
        activity.openUrl(`yoda-skill://bluetooth_music/bluetooth_start_bluetooth_music`, 'scene')
        break
      case 'next':
        nextMusic()
        break
      case 'disconnect_phone':
        disconnect()
        break
      case 'pre':
        previousMusic()
        break
      case 'stop':
        bluetoothPlayState = 'stop'
        pauseMusic()
        break
      case 'resume':
        resumeMusic()
        break
      case 'connect_phone':
        broadcast('connectPhone')
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
        logger.log('bluetooth_start_bluetooth_music', bluetoothState)
        if (bluetoothState !== 'connected' && bluetoothState !== 'stoped' &&
         bluetoothState !== 'played' && bluetoothState !== 'null') {
          broadcast('connectPhone', startMusic())
        } else {
          startMusic()
        }
        break
    }
  })
}
