'use strict'

var Service = require('@yodaos/application').Service
var logger = require('logger')('bluetooth-service')
var bluetooth = require('@yoda/bluetooth')
var protocol = bluetooth.protocol
var util = require('util')
var _ = require('@yoda/util')._
var os = global[Symbol.for('yoda#api')]
var strings = require('./strings.json')
var config = require('./config.json')
var res = require('./resources.json')
var AppTask = require('@yodaos/application').vui.AppTask
var network = require('@yoda/network')
var networkAgent = new network.NetworkAgent()

var a2dp = null
var hfp = null
var lastIntent = 'derived_from_phone'
var timer = null

function speak (text, alternativeVoice) {
  logger.debug(`speak: ${text}`)
  networkAgent.getWifiStatus().then((reply) => {
    if (reply.wifi.status === network.CONNECTED) {
      service.openUrl(`yoda-app://system/speak?text=${text}&alt=${alternativeVoice}`)
    } else {
      if (alternativeVoice != null) {
        var task = new AppTask([
          { media: alternativeVoice }
        ])
        task.execute()
      }
    }
  })
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
  '/luetooth_disconnect': () => {
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

function onRadioStateChangedListener (mode, state, extra) {
  logger.debug(`${mode} onRadioStateChanged(${state}, ${JSON.stringify(extra)})`)

  switch (state) {
    case protocol.RADIO_STATE.ON:
      var autoConn = _.get(extra, 'autoConn', false)
      logger.debug('autoConn = ', autoConn)
      speak(getText('SINK_OPENED'), res.AUDIO['ON_OPENED'])
      break
    case protocol.RADIO_STATE.ON_FAILED:
      if (mode === protocol.A2DP_MODE.SINK) {
        speak(getText('SINK_OPEN_FAILED'), res.AUDIO[state])
      } else {
        speak(getText('SOURCE_OPEN_FAILED'), res.AUDIO[state])
      }
      break
    case protocol.RADIO_STATE.OFF:
      speak(getText('CLOSED'), res.AUDIO[state])
      break
    default:
      break
  }
}

function onConnectionStateChangedListener (mode, state, device) {
  logger.debug(`${mode} onConnectionStateChanged(${state})`)
  switch (state) {
    case protocol.CONNECTION_STATE.CONNECTED:
      if (lastIntent === 'play_bluetoothmusic') {
        setTimer(() => {
          if (a2dp.getAudioState() !== protocol.AUDIO_STATE.PLAYING) {
            var dev = a2dp.getConnectedDevice()
            if (dev != null) {
              speak(getText('PLAY_FAILED_ARG1S', dev.name))
            }
          }
        }, config.TIMER.DELAY_BEFORE_PLAY_FAILED)
        speak(getText('PLEASE_WAIT'))
      } else {
        speak(getText('CONNECTED_ARG1S', device.name), res.AUDIO[state])
      }
      break
    case protocol.CONNECTION_STATE.DISCONNECTED:
      speak(getText('DISCONNECTED'))
      break
    case protocol.CONNECTION_STATE.CONNECT_FAILED:
      if (mode === protocol.A2DP_MODE.SOURCE) {
        speak(getText('SOURCE_CONNECT_FAILED_ARG1S', device.name), res.AUDIO[state])
      }
      break
    case protocol.CONNECTION_STATE.AUTOCONNECT_FAILED:
      if (lastIntent === 'bluetooth_broadcast') {
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
      service.openUrl('yoda-app://bluetooth-music/start')
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
      os.effect.play(res.LIGHT.DISCOVERY_ON, {}, { shouldResume: true, zIndex: 2 })
        .catch((err) => {
          logger.error('bluetooth play light error: ', err)
        })
      break
    case protocol.DISCOVERY_STATE.OFF:
      os.effect.stop(res.LIGHT.DISCOVERY_ON)
      break
    case protocol.DISCOVERY_STATE.DEVICE_LIST_CHANGED:
      break
    default:
      break
  }
}

var service = Service({
  created: () => {
    logger.debug('Bluetooth service created')
    a2dp = bluetooth.getAdapter(protocol.PROFILE.A2DP)
    a2dp.on('radio_state_changed', onRadioStateChangedListener)
    a2dp.on('connection_state_changed', onConnectionStateChangedListener)
    a2dp.on('audio_state_changed', onAudioStateChangedListener)
    a2dp.on('discovery_state_changed', onDiscoveryStateChangedListener)
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
    lastIntent = url.pathname
    handler(url)
  } else {
    speak(getText('FALLBACK'))
  }
}

module.exports = service
