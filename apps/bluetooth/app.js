'use strict'

var bluetooth = require('@yoda/bluetooth')
var logger = require('logger')('bluetooth')
var property = require('@yoda/property')
var wifi = require('@yoda/wifi')

module.exports = function (activity) {
  var player = bluetooth.getPlayer()
  var uuid = (property.get('ro.boot.serialno') || '').substr(-6)
  var productName = property.get('ro.rokid.build.productname') || 'Rokid-Me'
  var name = [ productName, uuid ].join('-')
  var nameToSpeak = [ productName, `<num=tel>${uuid}</num>` ].join('')
  var textTable = require('./texts.json')
  var bluetoothMessage = {
    'a2dpstate': null,
    'connect_state': null,
    'connect_name': null,
    'play_state': null,
    'broadcast_state': null
  }
  var activityPlayState = false
  var activityNlpIntent = null
  var BLUETOOTH_MUSIC_ID = 'RDDE53259D334860BA9E98CB3AB6C001'
  player.on('stateupdate', function (message) {
    logger.debug('stateupdate', message)
    bluetoothMessage = Object.assign(bluetoothMessage, message)
    if (message.play_state === 'played') {
      activity.setForeground({ form: 'scene', skillId: BLUETOOTH_MUSIC_ID })
    // for users from operating Bluetooth music from the phone.
    }
    bluetoothMessageSpeak(message, activityNlpIntent)// speak action
    bluetoothMessagelight(message)// light action
  })
  function broadcast (subsequent) {
    player.start(name, subsequent)
  }
  function bluetoothMessageSpeak (message, nlpIntent) {
    if (message.connect_state === 'disconnected' && message.a2dpstate !== 'close' &&
       message.a2dpstate === 'opened') {
      speakAndBackground(textTable['STRING_DISCONNECT_LINK'])
    }
    if (message.a2dpstate === 'opened' && message.connect_state === 'invalid' &&
      message.play_state === 'invalid') {
      if (message.linknum === 0) {
        if (nlpIntent === 'connect_phone') {
          speakAndBackground(textTable['STRING_CONNECT_MOBILE'] + textTable['STRING_OPEN_BEGIN'] +
           nameToSpeak + textTable['STRING_CONNECT_MOBILE_END'])
        } else {
          if (wifi.getWifiState() !== wifi.WIFI_CONNECTED) {
            mediaAndBackground('system://openbluetooth.ogg')
          } else {
            speakAndBackground(textTable['STRING_BROADCAST'] + textTable['STRING_OPEN_BEGIN'] +
            nameToSpeak + textTable['STRING_OPEN_END'])
          }
        }
      } else {
        mediaAndBackground('system://openbluetooth.ogg')
      }
    }
    if (message.a2dpstate === 'open failed' && message.connect_state === 'invalid' &&
    message.play_state === 'invalid') {
      if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
        activity.setForeground().then(() => {
          speakAndExit(textTable['STRING_OPENFAILED'])
        })
      } else {
        activity.setForeground().then(() => {
          mediaAndExit('system://openbluetootherror.ogg')
        })
      }
    }
    if (message.a2dpstate === 'opened' && message.connect_state === 'connected' &&
      message.play_state === 'invalid') {
      mediaAndSpeak(textTable['STRING_CONNECED'] + message.connect_name,
        'system://connectbluetooth.ogg')
    }
    if (message.a2dpstate === 'closed') {
      activity.setForeground().then(() => {
        activity.playSound('system://closebluetooth.ogg')
          .then(() => activity.exit({ clearContext: true }))
      })
    }
  }
  function bluetoothMessagelight (message) {
    if (message.broadcast_state === 'opened') {
      activity.light.play('system://bluetoothOpen.js', {}, { shouldResume: true })
        .catch((err) => {
          logger.error('bluetooth music light play', err)
        })
    } else { activity.light.stop('system://bluetoothOpen.js') }
  }
  function closebluetooth () {
    if (bluetoothMessage.a2dpstate !== 'closed') {
      player.end()
    }
  }
  function disconnect () {
    if (player !== null) { player.disconnect() }
  }

  function startMusic () {
    activity.setForeground({ form: 'scene', skillId: BLUETOOTH_MUSIC_ID }).then(() => {
      player = bluetooth.getPlayer()
      if (player && (bluetoothMessage.connect_state === 'connected' ||
       bluetoothMessage.play_state === 'stoped' ||
       bluetoothMessage.play_state === 'played')) {
        player.play()
        logger.log('bluetoothmusic start play')
      } else {
        activity.playSound('system://playbluetootherror.ogg')
      }
    })
  }

  function pauseMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.pause()
      logger.log('bluetoothmusic start stop')
    }
  }

  function resumeMusic () {
    player = bluetooth.getPlayer()
    if (player) {
      player.play()
      logger.log('bluetoothmusic start play')
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
    return activity.setForeground().then(() => {
      activity.tts.speak(text).catch((err) => {
        logger.error('bluetooth music tts error', err)
      }).then(() => {
        if (bluetoothMessage.play_state !== 'played') {
          activity.setBackground()
        }
      })
    })
  }
  function mediaAndBackground (text) {
    return activity.setForeground().then(() => {
      activity.media.start(text, { streamType: 'playback' })
        .then(() => {
          if (bluetoothMessage.play_state !== 'played') {
            activity.setBackground()
          }
        })
      // when (bluetoothState = played),You can't bring it Background.
    })
  }

  function mediaAndSpeak (speakString, mediaString) {
    if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
      activity.setForeground().then(() => {
        speakAndBackground(speakString)
      })
    } else {
      mediaAndBackground(mediaString)
    }
  }
  function speakAndExit (text) {
    return activity.tts.speak(text).catch((err) => {
      logger.error('bluetooth music tts error', err)
    }).then(() => activity.exit())
  }

  function mediaAndExit (text) {
    return activity.playSound(text)
      .then(() => activity.exit())
  }
  activity.on('pause', () => {
    if (bluetoothMessage.play_state === 'played') {
      pauseMusic()
      activityPlayState = true
    }
  })

  activity.on('resume', () => {
    if (bluetoothMessage.play_state === 'stoped' && activityPlayState) {
      activityPlayState = false
      resumeMusic()
    }
  })

  activity.on('destroy', () => {
    pauseMusic()
    player.end()
    activity.light.stop('system://bluetoothOpen.js')
  })

  activity.on('request', function (nlp, action) {
    activityNlpIntent = nlp.intent
    switch (nlp.intent) {
      case 'ask_bluetooth':
        speakAndBackground(textTable['STRING_ASK'])
        break
      case 'bluetooth_broadcast':
        broadcast()
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
        if (bluetoothMessage.connect_state !== 'connected' &&
           bluetoothMessage.play_state !== 'stoped' &&
           bluetoothMessage.play_state !== 'played' &&
           bluetoothMessage.play_state !== 'null') {
          broadcast('PLAY')
        } else {
          startMusic()
        }
        break
    }
  })
}
