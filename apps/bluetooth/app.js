'use strict'

var bluetooth = require('@yoda/bluetooth')
var logger = require('logger')('bluetooth-app')
var wifi = require('@yoda/wifi')
var _ = require('@yoda/util')._
var system = require('@yoda/system')
var protocol = bluetooth.protocol

module.exports = function (activity) {
  var a2dp = null
  var deviceName = system.getDeviceName()
  logger.debug(`deviceName = ${deviceName}`)
  var res = require('./resources.json')
  var strings = require('./strings.json')
  var BLUETOOTH_MUSIC_SKILL_ID = getBluetoothMusicSkillId()
  var needResume = false
  var lastIntent = null

  function getBluetoothMusicSkillId () {
    var pkg = require('./package.json')
    var hosts = pkg.manifest.hosts
    for (var i = 0; i < hosts.length; i++) {
      if (hosts[i][0] === 'bluetooth_music') {
        return hosts[i][1].skillId
      }
    }
  }

  function getText (mode, label) {
    var str = strings[mode][label]
    if (str === undefined || str === null) {
      str = strings[label]
    }
    return str
  }

  function getAccessName (mode) {
    if (mode === protocol.A2DP_MODE.SINK) {
      return deviceName
    } else {
      return getText(mode, 'ACCESS_NAME')
    }
  }

  function afterSpeak () {
    var mode = a2dp.getMode()
    logger.debug(`after speak(mode = ${mode}, playing = ${a2dp.isPlaying()})`)
    if (!a2dp.isPlaying()) {
      activity.setBackground()
    } else {
      a2dp.play()
    }
  }

  function speak (text, alternativeVoice) {
    logger.debug(`speak: ${text}`)
    return activity.setForeground().then(() => {
      if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
        return activity.tts.speak(text, { impatient: false })
      } else if (alternativeVoice != null) {
        logger.debug('No wifi connection, play alternative voice.')
        return activity.playSound(alternativeVoice)
      }
    }).then(() => afterSpeak())
  }

  function sendMsgToApp (event, data) {
    var msg = {
      'type': 'Bluetooth',
      'event': event
    }
    if (data !== undefined && data != null) {
      msg.template = JSON.stringify(data)
    }
    return activity.wormhole.sendToApp('event', JSON.stringify(msg))
  }

  var a2dpIntentHandlers = {
    /**
     * 1. common intents
     */
    // 1.1 ask for how to use bluetooth
    'ask_bluetooth': () => {
      speak(strings['ASK'])
    },
    // 1.2 add to favorites
    'like': () => {
      speak(strings['LIKE'])
    },
    // 1.3 open bluetooth
    'bluetooth_broadcast': (nlp) => {
      var mode = nlp.rokidAppCmd ? protocol.A2DP_MODE.SOURCE : protocol.A2DP_MODE.SINK
      a2dp.open(mode)
    },
    // 1.4 close bluetooth
    'bluetooth_disconnect': () => {
      a2dp.close()
    },
    // 1.5 disconnect from remote device
    'disconnect_devices': () => {
      a2dp.disconnect()
    },

    /**
     * 2. a2dp sink intents
     */
    // 2.1 open and auto connect to history phone via sink mode
    'connect_phone': () => {
      a2dp.open(protocol.A2DP_MODE.SINK)
    },
    // 2.2 disconnect from remote phone
    'disconnect_phone': () => {
      a2dp.disconnect()
    },
    // 2.3 directly play music via sink mode
    'play_bluetoothmusic': () => {
      activity.openUrl(res.URL['BLUETOOTH_MUSIC'], 'scene')
    },
    // 2.4 start bluetooth music play via cloud command
    'bluetooth_start_bluetooth_music': () => {
      var mode = a2dp.getMode()
      logger.debug(`${mode} opened:${a2dp.isOpened()}`)
      if (mode === protocol.A2DP_MODE.SINK && a2dp.isConnected() && !a2dp.isPlaying()) {
        a2dp.play()
      } else {
        a2dp.open(protocol.A2DP_MODE.SINK, {autoplay: true})
      }
    },
    // 2.5 play music
    'resume': () => {
      a2dp.play()
    },
    // 2.6 pause playing music
    'stop': () => {
      a2dp.pause()
    },
    // 2.7 play previous song
    'pre': () => {
      a2dp.prev()
    },
    // 2.8 play next song
    'next': () => {
      a2dp.next()
    },

    /**
     * 3. a2dp source intents
     */
    // 3.1 query bluetooth status via source mode
    'bluetooth_status': () => {
      var status = protocol.RADIO_STATE.OFF
      if (a2dp.getMode() === protocol.A2DP_MODE.SOURCE && a2dp.isOpened()) {
        status = protocol.RADIO_STATE.ON
      }
      logger.log(`status: ${status}, isConn: ${a2dp.isConnected()}`)
      var template = null
      if (status === protocol.RADIO_STATE.ON && a2dp.isConnected()) {
        template = {'currentDevice': a2dp.getConnectedDevice()}
      }
      sendMsgToApp(status, template)
    },
    // 3.2 open and auto connect to history bluetooth speaker via source mode
    'connect_speaker': () => {
      a2dp.open(protocol.A2DP_MODE.SOURCE)
    },
    // 3.3 connect to specified bluetooth speaker via source mode
    'connect_devices': (nlp) => {
      var targetAddr = nlp.slots.deviceAddress.value
      var targetName = nlp.slots.deviceName.value
      a2dp.connect(targetAddr, targetName)
    },
    // 3.4 disconnect from remote bluetooth speaker
    'disconnect_speaker': () => {
      a2dp.disconnect()
    },
    // 3.5 begin scan around bluetooth devices
    'bluetooth_discovery': () => {
      a2dp.discovery()
    }
  }

  function handleA2dpEvents (intent, nlp) {
    var intentHandler = a2dpIntentHandlers[intent]
    if (typeof intentHandler === 'function') {
      intentHandler(nlp !== null ? nlp : {})
    } else {
      speak(strings['FALLBACK'])
    }
  }

  function onRadioStateChangedListener (mode, state, extra) {
    logger.debug(`${mode} onRadioStateChanged(${state}, ${JSON.stringify(extra)})`)

    if (mode === protocol.A2DP_MODE.SOURCE) {
      sendMsgToApp(state)
    }
    switch (state) {
      case protocol.RADIO_STATE.ON:
        var autoConn = _.get(extra, 'autoConn', false)
        if (autoConn) {
          speak(getText(mode, 'OPEN_AUTOCONN'), res.AUDIO[state])
        } else { // No connection history
          var beginText = getText(mode, lastIntent === 'connect_phone' ? 'CONNECT_MOBILE_BEGIN' : 'OPEN_BEGIN')
          var accessName = getAccessName(mode)
          var endText = getText(mode, lastIntent === 'connect_phone' ? 'CONNECT_MOBILE_END' : 'OPEN_END')
          speak(beginText + accessName + endText, res.AUDIO[state])
        }
        break
      case protocol.RADIO_STATE.ON_FAILED:
        speak(getText(mode, 'OPEN_FAILED'), res.AUDIO[state])
        break
      case protocol.RADIO_STATE.OFF:
        if (mode !== a2dp.getMode()) {
          logger.debug('Suppress old mode "closed" prompt to avoid confusing users.')
        } else {
          speak(getText(mode, 'CLOSED'), res.AUDIO[state])
        }
        break
      default:
        break
    }
  }

  function onConnectionStateChangedListener (mode, state, device) {
    logger.debug(`${mode} onConnectionStateChanged(${state})`)

    if (mode === protocol.A2DP_MODE.SOURCE) {
      var data = device != null ? {'currentDevice': device} : null
      sendMsgToApp(state, data)
    }
    switch (state) {
      case protocol.CONNECTION_STATE.CONNECTED:
        speak(getText(mode, 'CONNECED_BEGIN') + device.name, res.AUDIO[state])
        break
      case protocol.CONNECTION_STATE.DISCONNECTED:
        if (mode !== a2dp.getMode()) {
          logger.debug('Suppress old mode "disconnected" prompt to avoid confusing users.')
        } else if (lastIntent === 'bluetooth_disconnect') {
          logger.debug('Suppress "disconnected" prompt while close.')
        } else {
          speak(getText(mode, 'DISCONNECTED'))
        }
        break
      case protocol.CONNECTION_STATE.CONNECT_FAILED:
        // NOP while connect failed according PRD.
        break
      case protocol.CONNECTION_STATE.AUTOCONNECT_FAILED:
        var beginText = getText(mode, 'CONNECT_MOBILE_BEGIN')
        var endText = getText(mode, 'CONNECT_MOBILE_END')
        speak(beginText + getAccessName(mode) + endText, res.AUDIO[state])
        break
      default:
        break
    }
  }

  function onAudioStateChangedListener (mode, state, extra) {
    logger.debug(`${mode} onAudioStateChanged(${state})`)

    switch (state) {
      case protocol.AUDIO_STATE.PLAYING:
        activity.setForeground({ form: 'scene', skillId: BLUETOOTH_MUSIC_SKILL_ID })
        break
      case protocol.AUDIO_STATE.PAUSED:
      case protocol.AUDIO_STATE.STOPPED:
        // NOP while pause/stop music according PRD.
        break
      case protocol.AUDIO_STATE.VOLUMN_CHANGED:
        // NOP while volumn changed according PRD.
        break
      default:
        break
    }
  }

  function onDiscoveryStateChangedListener (mode, state, extra) {
    logger.debug(`${mode} onDiscoveryChanged(${state})`)

    if (mode !== a2dp.getMode()) {
      logger.debug('Suppress old mode discovery events to avoid disturbing current event.')
      return
    }
    switch (state) {
      case protocol.DISCOVERY_STATE.ON:
        activity.light.play(res.LIGHT[state], {}, { shouldResume: true })
          .catch((err) => {
            logger.error('bluetooth play light error: ', err)
          })
        break
      case protocol.DISCOVERY_STATE.OFF:
        activity.light.stop(res.LIGHT[state])
        break
      case protocol.DISCOVERY_STATE.DEVICE_LIST_CHANGED:
        sendMsgToApp(state, extra)
        break
      default:
        break
    }
  }

  activity.on('create', () => {
    logger.log(`activity.onCreate()`)
    a2dp = bluetooth.getAdapter(protocol.PROFILE.A2DP)
    a2dp.on('radio_state_changed', onRadioStateChangedListener)
    a2dp.on('connection_state_changed', onConnectionStateChangedListener)
    a2dp.on('audio_state_changed', onAudioStateChangedListener)
    a2dp.on('discovery_state_changed', onDiscoveryStateChangedListener)
  })

  activity.on('pause', () => {
    var isPlaying = a2dp.isPlaying()
    logger.log(`activity.onPause(isPlaying: ${isPlaying})`)
    if (isPlaying) {
      needResume = true
      a2dp.pause()
    }
  })

  activity.on('resume', () => {
    logger.log(`activity.onResume(needResume: ${needResume})`)
    if (needResume) {
      needResume = false
      a2dp.play()
    }
  })

  activity.on('destroy', () => {
    logger.log('activity.onDestroy()')
    bluetooth.disconnect()
  })

  activity.on('request', function (nlp, action) {
    lastIntent = nlp.intent
    logger.log(`activity.onNlpRequest(intent: ${nlp.intent})`)
    handleA2dpEvents(nlp.intent, nlp)
  })

  activity.on('url', url => {
    logger.log(`activity.onUrl(${url.pathname})`)
    var intent = url.pathname.substr(1)
    handleA2dpEvents(intent)
  })
}
