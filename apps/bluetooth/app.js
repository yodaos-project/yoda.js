'use strict'

var bluetooth = require('@yoda/bluetooth')
var logger = require('logger')('bluetooth-app')
var wifi = require('@yoda/wifi')
var util = require('util')
var _ = require('@yoda/util')._
var system = require('@yoda/system')
var protocol = bluetooth.protocol
var httpUtil = require('./http-util.js')
var flora = require('@yoda/flora')

/**
 * Implement bluetooth PRD v1.3
 */
module.exports = function (activity) {
  var a2dp = null
  var hfp = null
  var deviceName = system.getDeviceName()
  logger.debug(`deviceName = ${deviceName}`)
  var res = require('./resources.json')
  var strings = require('./strings.json')
  var config = require('./config.json')
  var needResume = false
  var lastIntent = null
  var timer = null
  var onTopStack = false
  var onQuietMode = false
  var callState = protocol.CALL_STATE.IDLE
  var deviceProps = null
  var agent = null

  function setAppType (hosts, afterFunc) {
    var id = getSkillId(hosts)
    logger.debug(`setAppType(${hosts}: ${id})`)
    switch (hosts) {
      case 'bluetooth_music':
        var url = util.format(res.URL.PLAYER_CONTROLLER, id)
        activity.openUrl(url, { preemptive: false })
        if (typeof afterFunc === 'function') {
          activity.setForeground({ form: 'scene', skillId: id }).then(afterFunc)
        } else {
          activity.setForeground({ form: 'scene', skillId: id })
        }
        break
      case 'bluetooth_call':
        if (typeof afterFunc === 'function') {
          activity.setForeground({ form: 'scene', skillId: id }).then(afterFunc)
        } else {
          activity.setForeground({ form: 'scene', skillId: id })
        }
        break
      case 'bluetooth':
        if (typeof afterFunc === 'function') {
          activity.setBackground({ form: 'cut', skillId: id }).then(afterFunc)
        } else {
          activity.setBackground({ form: 'cut', skillId: id })
        }
        break
      default:
        break
    }
    activity.setContextOptions({ keepAlive: true })
  }

  function playIncomingRingtone () {
    activity.media.start(res.AUDIO.RINGTONE, { streamType: 'ring' })
  }

  function stopIncomingRingtone () {
    activity.media.stop()
  }

  function textIsEmpty (text) {
    return text === undefined || text === null || text.length === 0
  }

  function getSkillId (skillName) {
    var pkg = require('./package.json')
    var hosts = pkg.manifest.hosts
    for (var i = 0; i < hosts.length; i++) {
      if (hosts[i][0] === skillName) {
        return hosts[i][1].skillId
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
    logger.debug(`after speak(mode = ${a2dp.getMode()}, radio = ${a2dp.getRadioState()}, audio = ${a2dp.getAudioState()})`)
    if (a2dp.getAudioState() === protocol.AUDIO_STATE.PLAYING) {
      a2dp.unmute()
    } else {
      activity.setBackground()
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

  function initDeviceInfo () {
    activity.get().then((props) => {
      logger.debug('props = ' + props)
      deviceProps = props
    })
  }

  function addToFavorite (song) {
    var songData = {
      songName: song.title,
      singerName: song.artist
    }
    var reqParams = httpUtil.getRequestInfo('blue_like', deviceProps, songData)
    logger.log('addToFavorite.sendRequest:', reqParams)
    return httpUtil.sendRequest(res.URL.MUSIC_LIKE, reqParams, config.TIMER.HTTP_TIMEOUT)
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

  var intentHandlers = {
    /**
     * 1. common intents
     */
    // 1.1 ask for how to use bluetooth
    'ask_bluetooth': () => {
      speak(getText('ASK'))
    },
    // 1.2 add to favorites
    'like': () => {
      if (a2dp.getAudioState() === protocol.AUDIO_STATE.PLAYING) {
        a2dp.query()
      }
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
      var isConnected = a2dp.getConnectionState() === protocol.CONNECTION_STATE.CONNECTED
      var isPlaying = a2dp.getAudioState() === protocol.AUDIO_STATE.PLAYING
      logger.debug(`Start play bt music, mode=${mode}, radio=${a2dp.getRadioState()}`)
      if (mode === protocol.A2DP_MODE.SINK && isConnected && !isPlaying) {
        a2dp.play()
      } else {
        a2dp.open(protocol.A2DP_MODE.SINK, { autoplay: true })
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
      if (a2dp.getMode() === protocol.A2DP_MODE.SOURCE) {
        status = a2dp.getRadioState()
      }
      logger.log(`radio: ${status}, conn: ${a2dp.getConnectionState()}`)
      var template = null
      if (status === protocol.RADIO_STATE.ON && a2dp.getConnectionState() === protocol.CONNECTION_STATE.CONNECTED) {
        template = { 'currentDevice': a2dp.getConnectedDevice() }
      }
      sendMsgToApp(status, template)
      activity.setBackground()
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
      activity.setBackground()
      a2dp.discovery()
    },

    /**
     * 4. hands-free intents
     */
    // 4.1 accept incoming call
    'call_answer': () => {
      if (hfp.getCallState() === protocol.CALL_STATE.INCOMING) {
        hfp.answer()
      }
    },
    // 4.2 reject incoming call
    'call_refuse': () => {
      hfp.hangup()
    },
    // 4.3 call number
    'call_number': (nlp) => {
      var value = JSON.parse(nlp.slots.number.value)
      var number = value.number
      var dotIndex = number.indexOf('.')
      if (dotIndex !== -1) {
        number = number.substring(0, dotIndex)
      }
      logger.debug(`call number = ${number}`)
      if (hfp.getConnectionState() === protocol.CONNECTION_STATE.CONNECTED) {
        hfp.dial(number)
      } else {
        speak(getText('FALLBACK'))
      }
    },
    // 4.4 hang up
    'hang_up': (nlp) => {
      hfp.hangup()
    }
  }

  function handleIntents (intent, nlp) {
    cancelTimer()
    var intentHandler = intentHandlers[intent]
    if (typeof intentHandler === 'function') {
      intentHandler(nlp)
    } else {
      speak(getText('FALLBACK'))
    }
  }

  function handleSinkRadioOn (autoConn) {
    switch (lastIntent) {
      case 'bluetooth_broadcast':
      case 'callName':
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
            if (a2dp.getConnectionState() !== protocol.CONNECTION_STATE.CONNECTED) {
              speak(getText('SINK_OPENED_BY_ACTION_TIMEOUT_ARG1S', deviceName), res.AUDIO['ON_AUTOCONNECT_FAILED'])
            }
          }, config.TIMER.DELAY_BEFORE_AUTOCONNECT_FAILED)
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
      var data = ((device != null) ? { 'currentDevice': device } : null)
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
            if (a2dp.getConnectionState() === protocol.CONNECTION_STATE.CONNECTED &&
              a2dp.getAudioState() !== protocol.AUDIO_STATE.PLAYING) {
              var dev = a2dp.getConnectedDevice()
              if (dev != null) {
                speak(getText('PLAY_FAILED_ARG1S', dev.name))
              }
            }
          }, config.TIMER.DELAY_BEFORE_PLAY_FAILED)
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
        setAppType('bluetooth_music')
        cancelTimer()
        setTimer(() => { // To ensure unmute because turen may mute music by itself.
          if (!onQuietMode) {
            a2dp.unmute()
          }
        }, 100)
        break
      case protocol.AUDIO_STATE.PAUSED:
      case protocol.AUDIO_STATE.STOPPED:
        // NOP while pause/stop music according PRD.
        break
      case protocol.AUDIO_STATE.VOLUMN_CHANGED:
        // NOP while volumn changed according PRD.
        break
      case protocol.AUDIO_STATE.QUERY_RESULT:
        logger.debug(`  title: ${extra.title}`)
        logger.debug(`  artist: ${extra.artist}`)
        logger.debug(`  album: ${extra.album}`)
        addToFavorite(extra).then((ret) => {
          logger.debug('http result: ', ret)
          if (ret !== null && ret.success) {
            speak(ret.data.RKMusicResponse.result.tts)
          } else {
            speak(getText('ADD_TO_FAVORITE_FAILED'))
          }
        }).catch((err) => {
          logger.error('Send request failed: ', err)
          speak(getText('ADD_TO_FAVORITE_FAILED'))
        })
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
        if (lastIntent === 'bluetooth_disconnect') {
          logger.debug('Suppress "discovery" light while close.')
        } else {
          activity.light.play(res.LIGHT.DISCOVERY_ON, {}, { shouldResume: true })
            .catch((err) => {
              logger.error('bluetooth play light error: ', err)
            })
        }
        break
      case protocol.DISCOVERY_STATE.OFF:
        activity.light.stop(res.LIGHT.DISCOVERY_ON)
        break
      case protocol.DISCOVERY_STATE.DEVICE_LIST_CHANGED:
        sendMsgToApp(state, extra)
        break
      default:
        break
    }
  }

  function pauseMusic () {
    var audioState = a2dp.getAudioState()
    logger.debug(`pauseMusic(now: ${audioState})`)
    if (audioState === protocol.AUDIO_STATE.PLAYING) {
      needResume = true
      a2dp.pause()
      return true
    }
    return false
  }

  function resumeMusic () {
    logger.debug(`resumeMusic(top:${onTopStack} quiet:${onQuietMode} res:${needResume})`)
    if (onTopStack && !onQuietMode && needResume) {
      needResume = false
      a2dp.play()
      return true
    }
    return false
  }

  function onCallStateChangedListener (state) {
    logger.debug(`onCallStateChanged(${state}), lastState=${callState}`)
    switch (state) {
      case protocol.CALL_STATE.IDLE:
        if (callState !== protocol.CALL_STATE.IDLE) {
          if (callState === protocol.CALL_STATE.INCOMING || callState === protocol.CALL_STATE.RING) {
            stopIncomingRingtone()
          }
          activity.keyboard.restoreDefaults(config.KEY_CODE.POWER)
          activity.stopMonologue()
          a2dp.mute()
          var paused = pauseMusic()
          if (paused) {
            setAppType('bluetooth_music')
          } else {
            setAppType('bluetooth')
          }
          if (callState !== protocol.CALL_STATE.IDLE) {
            activity.light.play(res.LIGHT.CALL[state])
            activity.light.stop(res.LIGHT.CALL[callState])
          }
        }
        callState = state
        break
      case protocol.CALL_STATE.INCOMING:
        if (callState === protocol.CALL_STATE.IDLE) {
          pauseMusic()
          setAppType('bluetooth_call', () => {
            activity.startMonologue()
            activity.keyboard.preventDefaults(config.KEY_CODE.POWER)
          })
          activity.light.play(res.LIGHT.CALL[state], {}, { shouldResume: true })
            .catch((err) => {
              logger.error(`play ${state} light error: `, err)
            })
        }
        callState = state
        break
      case protocol.CALL_STATE.OFFHOOK:
        pauseMusic()
        if (callState === protocol.CALL_STATE.IDLE) {
          setAppType('bluetooth_call', () => {
            activity.startMonologue()
            activity.keyboard.preventDefaults(config.KEY_CODE.POWER)
          })
        } else if (callState === protocol.CALL_STATE.INCOMING || callState === protocol.CALL_STATE.RING) {
          stopIncomingRingtone()
        }
        activity.light.play(res.LIGHT.CALL[state], {}, { shouldResume: true })
          .catch((err) => {
            logger.error(`play ${state} light error: `, err)
          })
        if (callState !== state) {
          activity.light.stop(res.LIGHT.CALL[callState])
        }
        callState = state
        break
      case protocol.CALL_STATE.RING:
        playIncomingRingtone()
        break
      default:
        break
    }
  }

  function onKeyEvent (keyEvent) {
    logger.debug(`onKeyEvent(${keyEvent.keyCode}, call: ${hfp.getCallState()})`)
    switch (hfp.getCallState()) {
      case protocol.CALL_STATE.INCOMING:
        stopIncomingRingtone()
        hfp.answer()
        break
      case protocol.CALL_STATE.OFFHOOK:
        hfp.hangup()
        break
      default:
        break
    }
  }

  function onDeviceVolumeChanged (data) {
    var audioPath = data[0]
    var vol = data[1]
    logger.log(`audio path: ${audioPath}, vol: ${vol}`)
    if (audioPath === 'playback' && onTopStack &&
      a2dp.getAudioState() === protocol.AUDIO_STATE.PLAYING) {
      process.nextTick(() => {
        a2dp.syncVol(vol)
      })
    }
  }

  activity.on('create', () => {
    logger.log(`activity.onCreate()`)
    a2dp = bluetooth.getAdapter(protocol.PROFILE.A2DP)
    hfp = bluetooth.getAdapter(protocol.PROFILE.HFP)
    a2dp.on('radio_state_changed', onRadioStateChangedListener)
    a2dp.on('connection_state_changed', onConnectionStateChangedListener)
    a2dp.on('audio_state_changed', onAudioStateChangedListener)
    a2dp.on('discovery_state_changed', onDiscoveryStateChangedListener)
    hfp.on('call_state_changed', onCallStateChangedListener)
    activity.keyboard.on('click', onKeyEvent)
    activity.setContextOptions({ keepAlive: true })
    agent = new flora.Agent('unix:/var/run/flora.sock')
    agent.subscribe('yodart.audio.on-volume-change', onDeviceVolumeChanged)
    agent.start()
  })

  activity.on('ready', () => {
    logger.log('activity.onReady()')
    initDeviceInfo()
  })

  activity.on('resume', () => {
    logger.log(`activity.onResume()`)
    onTopStack = true
    if (hfp.getCallState() !== protocol.CALL_STATE.IDLE) {
      // Do nothing while in call.
    } else {
      resumeMusic()
    }
  })

  activity.on('active', () => {
    logger.log(`activity.onActive()`)
    onTopStack = true
  })

  activity.on('background', () => {
    logger.log(`activity.onBackground()`)
    onTopStack = false
    if (hfp.getCallState() !== protocol.CALL_STATE.IDLE) {
      // Do nothing while in call.
    } else if (a2dp.getAudioState() === protocol.AUDIO_STATE.PLAYING) {
      a2dp.disconnect()
      setAppType('bluetooth')
    }
  })

  activity.on('pause', () => {
    logger.log(`activity.onPause()`)
    onTopStack = false
    if (hfp.getCallState() !== protocol.CALL_STATE.IDLE) {
      // Do nothing while in call.
    } else {
      pauseMusic()
    }
  })

  activity.on('destroy', () => {
    logger.log('activity.onDestroy()')
    agent.close()
    agent.unsubscribe('yodart.audio.on-volume-change')
    if (a2dp !== null) {
      if (a2dp.getConnectionState() === protocol.CONNECTION_STATE.CONNECTED) {
        a2dp.disconnect()
      }
      a2dp.destroy()
      a2dp = null
    }
    if (hfp !== null) {
      hfp.destroy()
      hfp = null
    }
  })

  activity.on('request', function (nlp, action) {
    lastIntent = nlp.intent
    logger.log(`activity.onNlpRequest(intent: ${nlp.intent})`)
    handleIntents(nlp.intent, nlp)
  })

  activity.on('url', url => {
    lastIntent = url.pathname.substr(1)
    logger.log(`activity.onUrl(${lastIntent})`)
    handleIntents(lastIntent)
  })

  activity.on('notification', (state) => {
    logger.debug(`activity.onNotification(${state})`)
    switch (state) {
      case 'on-quite-front':
        onQuietMode = false
        resumeMusic()
        break
      case 'on-quite-back':
        onQuietMode = true
        if (hfp.getCallState() !== protocol.CALL_STATE.IDLE) {
          hfp.hangup()
        }
        pauseMusic()
        break
      case 'on-start-shake':
        if (a2dp.getAudioState() === protocol.AUDIO_STATE.PLAYING) {
          a2dp.next()
        }
        break
    }
  })
}
