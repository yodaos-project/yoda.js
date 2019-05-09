'use strict'

var Service = require('@yodaos/application').Service
var logger = require('logger')('bluetooth-service')
var bluetooth = require('@yoda/bluetooth')
var protocol = bluetooth.protocol
var util = require('util')
var _ = require('@yoda/util')._
var system = require('@yoda/system')
var rt = global[Symbol.for('yoda#api')]
var strings = require('./strings.json')
var config = require('./config.json')
var res = require('./resources.json')

var deviceName = null
var a2dp = null
var hfp = null
var lastUrl = '/derived_from_phone'
var timer = null

function speak (text, altVoice) {
  logger.debug(`speak: ${text}`)
  service.openUrl(`yoda-app://system/speak?text=${text}&alt=${altVoice}`)
}

function getText (label, args) {
  var txt = strings[label]
  if (args !== undefined) {
    txt = util.format(txt, args)
  }
  return txt
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

var urlHandlers = {
  // ask for how to use bluetooth
  '/ask_bluetooth': () => {
    speak(getText('ASK'))
  },
  // open bluetooth
  '/bluetooth_broadcast': (url) => {
    if (url.query != null && url.query.mode != null) {
      a2dp.open(url.query.mode)
    } else {
      a2dp.open()
    }
  },
  // close bluetooth
  '/bluetooth_disconnect': () => {
    a2dp.close()
  },
  // open and auto connect to history device (use last mode as default)
  '/connect_devices': () => {
    a2dp.open()
  },
  // open and auto connect to history phone (means sink mode)
  '/connect_phone': () => {
    a2dp.open(protocol.A2DP_MODE.SINK)
  },
  // open and auto connect to history speaker (means source mode)
  '/connect_speaker': () => {
    a2dp.open(protocol.A2DP_MODE.SOURCE)
  },
  // disconnect from remote device
  '/disconnect_devices': () => {
    a2dp.disconnect()
  },
  // disconnect from remote phone
  '/disconnect_phone': () => {
    a2dp.disconnect()
  },
  // disconnect from remote speaker
  '/disconnect_speaker': () => {
    a2dp.disconnect()
  },
  // sequentially open bt then connect to phone then start play music
  '/play_bluetoothmusic': () => {
    a2dp.open(protocol.A2DP_MODE.SINK, {autoplay: true})
  }
}

function handleSinkRadioOn (autoConn) {
  switch (lastUrl) {
    case '/bluetooth_broadcast':
      if (autoConn) {
        speak(getText('SINK_OPENED'), res.AUDIO['ON_OPENED'])
      } else {
        speak(getText('SINK_FIRST_OPENED_ARG1S', deviceName), res.AUDIO['ON_OPENED'])
      }
      lastUrl = '/derived_from_phone'
      break
    case '/connect_phone':
    case '/play_bluetoothmusic':
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
  lastUrl = '/derived_from_phone'
}

function onRadioStateChangedListener (mode, state, extra) {
  logger.debug(`${mode} onRadioStateChanged(${state}, ${JSON.stringify(extra)})`)
  cancelTimer()
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
      if (lastUrl === '/bluetooth_disconnect') {
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
  if (mode !== a2dp.getMode()) {
    logger.warn('Suppress old mode event to avoid confusing users.')
    return
  }
  switch (state) {
    case protocol.CONNECTION_STATE.CONNECTED:
      if (lastUrl === '/play_bluetoothmusic') {
        setTimer(() => {
          if (a2dp.getConnectionState() === protocol.CONNECTION_STATE.CONNECTED &&
            a2dp.getAudioState() !== protocol.AUDIO_STATE.PLAYING) {
            var dev = a2dp.getConnectedDevice()
            if (dev != null) {
              speak(getText('PLAY_FAILED_ARG1S', dev.name))
            }
          }
        }, config.TIMER.DELAY_BEFORE_PLAY_FAILED)
        speak(getText('PLEASE_WAIT'))
      } else {
        speak(getText('CONNECTED_ARG1S', device.name), res.AUDIO[state])
        lastUrl = '/derived_from_phone'
      }
      break
    case protocol.CONNECTION_STATE.DISCONNECTED:
      if (lastUrl !== '/implicit_disconnect' && lastUrl !== '/bluetooth_disconnect') {
        speak(getText('DISCONNECTED'))
      } else {
        logger.debug('Suppress "disconnected" prompt while NOT user explicit intent.')
      }
      break
    case protocol.CONNECTION_STATE.CONNECT_FAILED:
      if (mode === protocol.A2DP_MODE.SOURCE) {
        speak(getText('SOURCE_CONNECT_FAILED_ARG1S', device.name), res.AUDIO[state])
      }
      break
    case protocol.CONNECTION_STATE.AUTOCONNECT_FAILED:
      if (lastUrl === '/bluetooth_broadcast') {
        // NOP while auto connect failed if user only says 'open bluetooth'.
      } else {
        speak(getText('SOURCE_CONNECT_FAILED_ARG1S', device.name), res.AUDIO[state])
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
      a2dp.mute()
      service.openUrl(res.URL.BLUETOOTH_MUSIC)
      break
    default:
      break
  }
}

function onDiscoveryStateChangedListener (mode, state, extra) {
  logger.debug(`${mode} onDiscoveryChanged(${state})`)
  if (mode !== a2dp.getMode()) {
    logger.debug('Suppress old mode discovery events to avoid disturbing current event.')
  }
  switch (state) {
    case protocol.DISCOVERY_STATE.ON:
      if (lastUrl !== '/implicit_disconnect' && lastUrl !== '/bluetooth_disconnect') {
        rt.effect.play(res.LIGHT.DISCOVERY_ON, {}, { shouldResume: true, zIndex: 2 })
          .catch((err) => {
            logger.error('bluetooth play light error: ', err)
          })
      } else {
        logger.debug('Suppress "discovery" light in conditions which is not user explicit intents.')
      }
      break
    case protocol.DISCOVERY_STATE.OFF:
      rt.effect.stop(res.LIGHT.DISCOVERY_ON)
      break
    case protocol.DISCOVERY_STATE.DEVICE_LIST_CHANGED:
      break
    default:
      break
  }
}

function onCallStateChangedListener (state, extra) {
  logger.debug(`onCallStateChanged(${state})`)
  switch (state) {
    case protocol.CALL_STATE.INCOMING:
      service.openUrl(res.URL.BLUETOOTH_CALL)
      break
    default:
      break
  }
}

var service = Service({
  created: () => {
    logger.debug('Bluetooth service created')
    a2dp = bluetooth.getAdapter(protocol.PROFILE.A2DP)
    hfp = bluetooth.getAdapter(protocol.PROFILE.HFP)
    a2dp.on('radio_state_changed', onRadioStateChangedListener)
    a2dp.on('connection_state_changed', onConnectionStateChangedListener)
    a2dp.on('audio_state_changed', onAudioStateChangedListener)
    a2dp.on('discovery_state_changed', onDiscoveryStateChangedListener)
    hfp.on('call_state_changed', onCallStateChangedListener)
    deviceName = `<num=tel>${system.getDeviceName()}</num>`
  },
  destroyed: () => {
    logger.debug('Bluetooth service destroyed')
    if (a2dp !== null) {
      a2dp.close()
      a2dp.destroy()
      a2dp = null
    }
    if (hfp !== null) {
      hfp.destroy()
      hfp = null
    }
  },
  url: (url) => {
    logger.debug('on url: ', url)
    logger.debug(`pathname = ${url.pathname}`)
    switch (url.pathname) {
      case '/stop':
        this.finish()
        break
    }
  }
})

service.handleUrl = (url) => {
  logger.debug('handleIntents: ', url.pathname)
  cancelTimer()
  var handler = urlHandlers[url.pathname]
  if (typeof handler === 'function') {
    lastUrl = url.pathname
    handler(url)
  } else {
    speak(getText('FALLBACK'))
  }
}

module.exports = service
