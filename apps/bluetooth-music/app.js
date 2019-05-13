'use strict'

var logger = require('logger')('bluetooth-music')
var Application = require('@yodaos/application').Application
var rt = global[Symbol.for('yoda#api')]
var bluetooth = require('@yoda/bluetooth')
var protocol = bluetooth.protocol
var AudioFocus = require('@yodaos/application').AudioFocus
var Agent = require('@yoda/flora').Agent
var strings = require('./strings.json')
var util = require('util')

var audioFocus = null
var a2dp = null
var agent = null
var intent = ''
var lastState = 'stop'

function textIsEmpty (text) {
  return text === undefined || text === null || text.length === 0
}

function speak (text) {
  app.openUrl(`yoda-app://system/speak?text=${text}`)
}

function getText (label, args) {
  var txt = strings[label]
  if (args !== undefined) {
    txt = util.format(txt, args)
  }
  return txt
}

function onAudioFocusGained () {
  logger.debug('onAudioFocusGained')
  a2dp.unmute()
}

function onAudioFocusLost () {
  logger.debug('onAudioFocusLost')
  a2dp.pause()
  a2dp.destroy()
  rt.exit()
}

function reportToCloud (event, data) {
  logger.debug(`report play event ${event}`)
  var msg = {
    event: event,
    data: data
  }
  agent.post('yodaos.apps.bluetooth-player', [ JSON.stringify(msg) ])
}

function handleIntent (intent) {
  logger.debug(`intent = ${intent}`)
  switch (intent) {
    case 'start':
    case 'resume':
      a2dp.play()
      break
    case 'pause':
      a2dp.pause()
      break
    case 'stop':
      a2dp.stop()
      break
    case 'next':
      a2dp.next()
      break
    case 'pre':
      a2dp.prev()
      break
    case 'like':
    case 'bluetooth_info':
      a2dp.query()
      break
    case 'quit':
      rt.exit()
      break
    default:
      break
  }
}

function onAudioStateChangedListener (mode, state, extra) {
  logger.debug(`${mode} onAudioStateChanged(${state})`)
  switch (state) {
    case protocol.AUDIO_STATE.PLAYING:
      reportToCloud(lastState === 'stop' ? 'start' : 'resume')
      break
    case protocol.AUDIO_STATE.PAUSED:
      reportToCloud('pause')
      break
    case protocol.AUDIO_STATE.STOPPED:
      if (intent === 'pause') {
        reportToCloud('pause')
      } else {
        reportToCloud('stop')
        audioFocus.abandon()
      }
      break
    case protocol.AUDIO_STATE.QUERY_RESULT:
      logger.debug(`  title: ${extra.title}`)
      logger.debug(`  artist: ${extra.artist}`)
      logger.debug(`  album: ${extra.album}`)
      var fail = textIsEmpty(extra.title) || textIsEmpty(extra.artist)
      switch (intent) {
        case 'bluetooth_info':
          if (fail) {
            speak(getText('MUSIC_INFO_FAIL'))
          } else {
            if (textIsEmpty(extra.album)) {
              extra.album = extra.title
            }
            speak(util.format(strings.MUSIC_INFO_SUCC, extra.artist, extra.title, extra.album))
            reportToCloud('info', [ extra.artist, extra.title, extra.album ])
          }
          break
        case 'like':
        default:
          break
      }
      intent = ''
      break
    case protocol.AUDIO_STATE.VOLUMN_CHANGED:
    default:
      break
  }
}

var app = Application({
  created: () => {
    logger.debug('created')
    a2dp = bluetooth.getAdapter(protocol.PROFILE.A2DP)
    a2dp.on('audio_state_changed', onAudioStateChangedListener)

    agent = new Agent('unix:/var/run/flora.sock')
    agent.start()

    audioFocus = new AudioFocus(AudioFocus.TRANSIENT_EXCLUSIVE)
    audioFocus.onGain = onAudioFocusGained
    audioFocus.onLoss = onAudioFocusLost
    audioFocus.request()
  },
  destroyed: () => {
    logger.debug('destroyed')
    agent.close()
    audioFocus.abandon()
  },
  url: (url) => {
    logger.debug('on url: ', url)
    intent = url.pathname.substr(1)
    handleIntent(intent)
  },
  broadcast: channel => {
    logger.debug('on broadcast: ', channel)
    switch (channel) {
      case 'on-quite-front':
        intent = 'resume'
        break
      case 'on-quite-back':
        intent = 'pause'
        break
      case 'on-stop-shake':
        intent = 'next'
        break
      default:
        break
    }
    handleIntent(intent)
  }
})

module.exports = app
