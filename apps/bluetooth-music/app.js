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
var lastUrl = null

function textIsEmpty (text) {
  return (typeof text !== 'string') || (text.length === 0)
}

function speak (text) {
  app.openUrl(`yoda-app://system/speak?text=${text}`)
}

function resetLastUrl () {
  lastUrl = ''
}

function onAudioFocusGained () {
  logger.debug('onAudioFocusGained')
  a2dp.unmute()
}

function onAudioFocusLost (transient, mayDuck) {
  logger.debug('onAudioFocusLost, transient =', transient)
  if (transient) {
    if (mayDuck) {
      // TODO: Duck music volume.
    } else {
      a2dp.mute()
    }
  } else {
    a2dp.pause()
    a2dp.destroy()
    rt.activity.exit()
  }
}

function uploadEvent (event, data) {
  logger.debug('upload bluetooth event =', event)
  var MEDIA_SOURCE_BLUETOOTH = 3
  var event2status = {
    PLAYING: 0,
    STOPPED: 1,
    PAUSED: 2
  }
  var msg = [ MEDIA_SOURCE_BLUETOOTH, event2status[event] ]
  agent.post('yodaos.apps.multimedia.playback-status', msg)
}

function handleUrl (url) {
  lastUrl = url
  switch (url) {
    case '/start':
      a2dp.play()
      break
    case '/pause':
      a2dp.pause()
      break
    case '/stop':
      a2dp.stop()
      break
    case '/next':
      a2dp.next()
      break
    case '/prev':
      a2dp.prev()
      break
    case '/like':
    case '/info':
      a2dp.query()
      break
    case '/quit':
      rt.activity.exit()
      break
    case '/PLAYING':
      uploadEvent(protocol.AUDIO_STATE.PLAYING)
      break
    default:
      speak(strings.FALLBACK)
      break
  }
}

function onAudioStateChangedListener (mode, state, extra) {
  logger.debug(`${mode} onAudioStateChanged(${state})`)
  switch (state) {
    case protocol.AUDIO_STATE.PLAYING:
      uploadEvent(state)
      break
    case protocol.AUDIO_STATE.PAUSED:
      uploadEvent(state)
      break
    case protocol.AUDIO_STATE.STOPPED:
      if (lastUrl === '/pause') {
        uploadEvent(protocol.AUDIO_STATE.PAUSED)
      } else {
        uploadEvent(state)
        audioFocus.abandon()
      }
      break
    case protocol.AUDIO_STATE.MUSIC_INFO:
      logger.debug(`  title: ${extra.title}`)
      logger.debug(`  artist: ${extra.artist}`)
      logger.debug(`  album: ${extra.album}`)
      switch (lastUrl) {
        case '/info':
          uploadEvent(state, extra)
          if (textIsEmpty(extra.title)) {
            speak(strings.MUSIC_INFO_FAIL)
          } else if (textIsEmpty(extra.artist) && textIsEmpty(extra.album)) {
            speak(util.format(strings.MUSIC_INFO_SUCC_TITLE, extra.title))
          } else if (textIsEmpty(textIsEmpty(extra.album))) {
            speak(util.format(strings.MUSIC_INFO_SUCC_TITLE_ARTIST, extra.artist, extra.title))
          } else if (textIsEmpty(extra.artist)) {
            speak(util.format(strings.MUSIC_INFO_SUCC_TITLE_ALBUM, extra.title, extra.album))
          } else {
            speak(util.format(strings.MUSIC_INFO_SUCC, extra.artist, extra.title, extra.album))
          }
          break
        case '/like':
          uploadEvent(state, extra)
          break
        default:
          break
      }
      resetLastUrl()
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
    logger.debug('on url:', url.pathname)
    if (url.pathname !== '/') {
      handleUrl(url.pathname)
    }
  },
  broadcast: channel => {
    logger.debug('on broadcast: ', channel)
    var pathname = ''
    switch (channel) {
      case 'on-quite-front':
        pathname = '/start'
        break
      case 'on-quite-back':
        pathname = '/pause'
        break
      case 'on-stop-shake':
        pathname = '/next'
        break
      default:
        break
    }
    handleUrl(pathname)
  }
})

module.exports = app
