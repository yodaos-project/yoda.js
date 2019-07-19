'use strict'

var logger = require('logger')('bluetooth-music')
var Application = require('@yodaos/application').Application
var bluetooth = require('@yoda/bluetooth')
var protocol = bluetooth.protocol
var AudioFocus = require('@yodaos/application').AudioFocus
var Agent = require('@yoda/flora').Agent
var strings = require('./strings.json')

var audioFocus = null
var a2dp = null
var agent = null
var lastUrl = null
var needResume = false
var playing = false

function speak (text) {
  app.openUrl(`yoda-app://system/speak?text=${text}`)
}

function resetLastUrl () {
  lastUrl = '/phone'
}

function onAudioFocusGained () {
  logger.info(`onAudioFocusGained, needResume=${needResume}, playing=${playing}`)
  if (needResume && !playing) {
    a2dp.play()
  }
}

function onAudioFocusLost (transient, mayDuck) {
  logger.info(`onAudioFocusLost, transient=${transient}, playing=${playing}`)
  if (transient) {
    if (playing) {
      needResume = true
      lastUrl = '/pause'
      a2dp.pause()
    } else {
      needResume = false
    }
  } else {
    uploadEvent(protocol.AUDIO_STATE.STOPPED)
    app.openUrl('yoda-app://bluetooth/implied_close')
    needResume = false
  }
}

function uploadEvent (event) {
  logger.debug('upload bluetooth event', event)
  var event2status = {
    [protocol.AUDIO_STATE.PLAYING]: 0,
    [protocol.AUDIO_STATE.STOPPED]: 1,
    [protocol.AUDIO_STATE.PAUSED]: 4
  }
  agent.post('yodaos.apps.bluetooth.multimedia.playback-status', [ event2status[event] ])
}

function uploadInfo (info) {
  logger.debug('upload bluetooth music info')
  agent.post('yodaos.apps.bluetooth.multimedia.music-info', [ JSON.stringify(info) ])
}

function handleUrl (url) {
  resetLastUrl()
  switch (url) {
    case '/start':
      if (!a2dp.isConnected()) {
        app.openUrl('yoda-app://bluetooth/open_and_play')
      } else {
        a2dp.play()
      }
      lastUrl = url
      break
    case '/pause':
      needResume = false
      if (playing) {
        a2dp.pause()
        lastUrl = url
      }
      break
    case '/stop':
      needResume = false
      if (playing) {
        a2dp.stop()
        lastUrl = url
      } else {
        if (audioFocus.state !== 'inactive') {
          audioFocus.abandon()
        } else {
          app.openUrl('yoda-app://bluetooth/disconnect')
        }
      }
      break
    case '/next':
      a2dp.next()
      lastUrl = url
      break
    case '/prev':
      a2dp.prev()
      lastUrl = url
      break
    case '/like':
    case '/info':
      a2dp.query()
      lastUrl = url
      break
    case '/PLAYING':
      logger.debug('focus state:', audioFocus.state)
      playing = true
      if (audioFocus.state !== 'active') {
        audioFocus.request()
      }
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
      playing = true
      break
    case protocol.AUDIO_STATE.PAUSED:
      playing = false
      uploadEvent(state)
      break
    case protocol.AUDIO_STATE.STOPPED:
      playing = false
      if (lastUrl === '/pause') {
        state = protocol.AUDIO_STATE.PAUSED
      }
      if (lastUrl === '/stop') {
        audioFocus.abandon()
      } else {
        uploadEvent(state)
      }
      break
    case protocol.AUDIO_STATE.MUSIC_INFO:
      logger.debug(`  title: ${extra.title}`)
      logger.debug(`  artist: ${extra.artist}`)
      logger.debug(`  album: ${extra.album}`)
      uploadInfo(extra)
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

    audioFocus = new AudioFocus()
    audioFocus.onGain = onAudioFocusGained
    audioFocus.onLoss = onAudioFocusLost
  },
  destroyed: () => {
    logger.debug('destroyed')
    agent.close()
    if (audioFocus.state !== 'inactive') {
      audioFocus.abandon()
    }
    a2dp.destroy()
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
