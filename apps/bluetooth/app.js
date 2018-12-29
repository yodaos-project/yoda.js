'use strict'

var bluetooth = require('@yoda/bluetooth')
var logger = require('logger')('bluetooth-app')
var wifi = require('@yoda/wifi')
var util = require('util')
var _ = require('@yoda/util')._
var system = require('@yoda/system')
var protocol = bluetooth.protocol

/**
 * Implement bluetooth PRD v1.3
 */
module.exports = function (activity) {
  var a2dp = null
  var deviceName = system.getDeviceName()
  logger.debug(`deviceName = ${deviceName}`)
  var res = require('./resources.json')
  var strings = require('./strings.json')
  var config = require('./config.json')
  var BLUETOOTH_MUSIC_SKILL_ID = getBluetoothMusicSkillId()
  var needResume = false
  var lastIntent = null
  var timer = null

  function textIsEmpty (text) {
    return text === undefined || text === null || text.length === 0
  }

  function getBluetoothMusicSkillId () {
    var pkg = require('./package.json')
    var hosts = pkg.metadata.hosts
    for (var i = 0; i < hosts.length; i++) {
      if (hosts[i].name === 'bluetooth_music') {
        return hosts[i].skillId
      }
    }
  }

  function getText (label, args) {
    var txt = strings[label]
    if (txt !== undefined) {
      if (args !== undefined) {
        txt = util.format(txt, args)
      }
      return txt
    } else {
      return ''
    }
  }

  function afterSpeak () {
    var mode = a2dp.getMode()
    logger.debug(`after speak(mode = ${mode}, opened = ${a2dp.isOpened()}, playing = ${a2dp.isPlaying()})`)
    if (!a2dp.isOpened()) {
      activity.exit()
    } else if (!a2dp.isPlaying()) {
      activity.setBackground()
    } else {
      a2dp.play()
    }
  }

  function speak (text, alternativeVoice) {
    logger.debug(`speak: ${text}`)
    if (!textIsEmpty(text)) {
      return activity.setForeground().then(() => {
        if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
          return activity.tts.speak(text, { impatient: false }).catch((err) => {
            logger.error('play tts error: ', err)
          })
        } else if (alternativeVoice != null) {
          logger.debug('No wifi connection, play alternative voice.')
          return activity.playSound(alternativeVoice)
        }
      }).then(afterSpeak)
    }
  }

  function setTimer (callback, timeout) {
    if (timer != null) {
      clearTimeout(timer)
    }
    timer = setTimeout(callback, timeout)
  }

  function cancelTimer () {
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
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
      speak(getText('ASK'))
    },
    // 1.2 add to favorites
    'like': () => {
      speak(getText('LIKE'))
    },
    // 1.3 open bluetooth
    'bluetooth_broadcast': (nlp) => {
      var mode = protocol.A2DP_MODE.SINK
      if (nlp !== undefined && nlp !== null && nlp.rokidAppCmd) {
        mode = protocol.A2DP_MODE.SOURCE
      }
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
      if (nlp !== undefined && nlp !== null && nlp.slots !== null) {
        var targetAddr = nlp.slots.deviceAddress.value
        var targetName = nlp.slots.deviceName.value
        a2dp.connect(targetAddr, targetName)
      } else {
        logger.error('null nlp while connect device.')
      }
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
    cancelTimer()
    var intentHandler = a2dpIntentHandlers[intent]
    if (typeof intentHandler === 'function') {
      intentHandler(nlp)
    } else {
      speak(getText('FALLBACK'))
    }
  }

  function handleSinkRadioOn (autoConn) {
    switch (lastIntent) {
      case 'bluetooth_broadcast':
        if (autoConn) {
          speak(getText('SINK_OPENED'), res.AUDIO['ON_OPENED'])
        } else {
          speak(getText('SINK_FIRST_OPENED_ARG1S', deviceName), res.AUDIO['ON_OPENED'])
        }
        break
      case 'connect_phone':
      case 'bluetooth_start_bluetooth_music':
        if (autoConn) {
          setTimer(() => {
            if (!a2dp.isConnected()) {
              speak(getText('SINK_OPENED_BY_ACTION_TIMEOUT_ARG1S', deviceName), res.AUDIO['ON_AUTOCONNECT_FAILED'])
            }
          }, config.DELAY_BEFORE_AUTOCONNECT_FAILED)
        } else {
          speak(getText('SINK_FIRST_OPENED_BY_CONNECT_ARG1S', deviceName), res.AUDIO['ON_OPENED'])
        }
        break
      default:
        break
    }
  }

  function handleSourceRadioOn (autoConn) {
    if (autoConn) {
      speak(getText('SOURCE_OPENED'), res.AUDIO['ON_OPENED'])
    } else {
      speak(getText('SOURCE_FIRST_OPENED'), res.AUDIO['ON_OPENED'])
    }
  }

  function onRadioStateChangedListener (mode, state, extra) {
    logger.debug(`${mode} onRadioStateChanged(${state}, ${JSON.stringify(extra)})`)

    cancelTimer()
    if (mode === protocol.A2DP_MODE.SOURCE) {
      sendMsgToApp(state)
    }
    if (mode !== a2dp.getMode()) {
      logger.warn('Suppress old mode event to avoid confusing users.')
      return
    }
    switch (state) {
      case protocol.RADIO_STATE.ON:
        var autoConn = _.get(extra, 'autoConn', false)
        if (mode === protocol.A2DP_MODE.SINK) {
          handleSinkRadioOn(autoConn)
        } else {
          handleSourceRadioOn(autoConn)
        }
        break
      case protocol.RADIO_STATE.ON_FAILED:
        if (mode === protocol.A2DP_MODE.SINK) {
          speak(getText('SINK_OPEN_FAILED'), res.AUDIO[state])
        } else {
          speak(getText('SOURCE_OPEN_FAILED'), res.AUDIO[state])
        }
        break
      case protocol.RADIO_STATE.OFF:
        if (lastIntent === 'bluetooth_disconnect') {
          speak(getText('CLOSED'), res.AUDIO[state])
        }
        break
      default:
        break
    }
  }

  function onConnectionStateChangedListener (mode, state, device) {
    logger.debug(`${mode} onConnectionStateChanged(${state})`)
    cancelTimer()
    if (mode === protocol.A2DP_MODE.SOURCE) {
      var data = ((device != null) ? {'currentDevice': device} : null)
      sendMsgToApp(state, data)
    }
    if (mode !== a2dp.getMode()) {
      logger.warn('Suppress old mode event to avoid confusing users.')
      return
    }
    switch (state) {
      case protocol.CONNECTION_STATE.CONNECTED:
        if (lastIntent === 'bluetooth_start_bluetooth_music') {
          setTimer(() => {
            if (a2dp.isConnected() && !a2dp.isPlaying()) {
              var dev = a2dp.getConnectedDevice()
              if (dev != null) {
                speak(getText('PLAY_FAILED_ARG1S', dev.name))
              }
            }
          }, config.DELAY_BEFORE_PLAY_FAILED)
          speak(getText('PLEASE_WAIT'), res.AUDIO[state])
        } else {
          speak(getText('CONNECTED_ARG1S', device.name), res.AUDIO[state])
        }
        break
      case protocol.CONNECTION_STATE.DISCONNECTED:
        if (lastIntent === 'bluetooth_disconnect') {
          logger.debug('Suppress "disconnected" prompt while close.')
        } else {
          speak(getText('DISCONNECTED'))
        }
        break
      case protocol.CONNECTION_STATE.CONNECT_FAILED:
        if (mode === protocol.A2DP_MODE.SOURCE) {
          speak(getText('SOURCE_CONNECT_FAILED'), res.AUDIO[state])
        }
        break
      case protocol.CONNECTION_STATE.AUTOCONNECT_FAILED:
        if (lastIntent === 'bluetooth_broadcast') {
          // NOP while auto connect failed if user only says 'open bluetooth'.
        } else {
          speak(getText('SOURCE_CONNECT_FAILED'), res.AUDIO[state])
        }
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
        cancelTimer()
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
    a2dp = bluetooth.getAdapter(protocol.PROFILE.A2DP)
    logger.log(`activity.onCreate(adapter = ${a2dp})`)
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
    a2dp.removeAllListener()
    bluetooth.disconnect()
  })

  activity.on('request', function (nlp, action) {
    lastIntent = nlp.intent
    logger.log(`activity.onNlpRequest(intent: ${nlp.intent})`)
    handleA2dpEvents(nlp.intent, nlp)
  })

  activity.on('url', url => {
    lastIntent = url.pathname.substr(1)
    logger.log(`activity.onUrl(${lastIntent})`)
    handleA2dpEvents(lastIntent)
  })
}
