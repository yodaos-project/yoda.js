'use strict'

var Application = require('@yodaos/application').Application
var AudioFocus = require('@yodaos/application').AudioFocus
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis
var MediaPlayer = require('@yoda/multimedia').MediaPlayer

var logger = require('logger')('@system')
var system = require('@yoda/system')
var battery = require('@yoda/battery')
var manifest = require('@yoda/manifest')
var reply = require('./reply.json')
var apiInstance
var synth
var player = null

function speak (text, altVoice) {
  var focus = new AudioFocus(AudioFocus.Type.TRANSIENT, apiInstance.audioFocus)
  focus.onGain = () => {
    synth.speak(text)
      .on('end', done)
      .on('error', doAlt)
      .on('cancel', done)

    function done () {
      focus.abandon()
    }

    function doAlt () {
      if (altVoice != null) {
        player = new MediaPlayer()
        player.on('playbackcomplete', done)
        player.on('error', done)
        player.start(altVoice)
      } else {
        done()
      }
    }
  }
  focus.onLoss = () => {
    synth.cancel()
    if (player != null) {
      player.stop()
    }
  }
  focus.request()
}

module.exports = (api) => {
  apiInstance = api
  synth = new SpeechSynthesis(api)
  return Application({
    created: function created () {
      // FIXME: remove this if the @yodaos/mm doesn't depend on this hook.
    },
    url: function url (urlObj) {
      switch (urlObj.pathname) {
        case '/speak':
          speak(urlObj.query.text, urlObj.query.alt)
          break
        case '/reboot':
          if (!manifest.isCapabilityEnabled('battery')) {
            speak(reply.REBOOT_WHEN_NO_BATTERY)
            break
          }
          api.effect.play('system://shutdown.js')
            .then(() => system.reboot())
          break
        case '/shutdown':
          if (!manifest.isCapabilityEnabled('battery')) {
            speak(reply.SHUTDOWN_WHEN_NO_BATTERY)
            break
          }
          api.effect.play('system://shutdown.js')
            .then(() => battery.getBatteryCharging())
            .then(charging => {
              logger.info('shuting down, charging?', charging)
              if (charging) {
                return system.rebootCharging()
              }
              return system.powerOff()
            })
          break
        case '/recovery':
          system.setRecoveryMode()
          api.effect.play('system://shutdown.js')
            .then(() => system.reboot('recovery'))
          break
        case '/idle':
          api.visibility.abandonAllVisibilities()
          break
      }
    }
  }, api)
}
