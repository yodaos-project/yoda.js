'use strict'

var Application = require('@yodaos/application').Application
var AudioFocus = require('@yodaos/application').AudioFocus
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis

var logger = require('logger')('@system')
var system = require('@yoda/system')
var battery = require('@yoda/battery')
var apiInstance
var synth

function speak (text) {
  var focus = new AudioFocus(AudioFocus.Type.TRANSIENT, apiInstance.audioFocus)
  focus.onGain = () => {
    synth.speak(text)
      .on('end', done)
      .on('error', done)
      .on('cancel', done)

    function done () {
      focus.abandon()
    }
  }
  focus.onLoss = () => {
    synth.cancel()
  }
  focus.request()
}

module.exports = (api) => {
  apiInstance = api
  synth = new SpeechSynthesis(api)
  return Application({
    url: function url (urlObj) {
      switch (urlObj.pathname) {
        case '/speak':
          speak(urlObj.query.text)
          break
        case '/reboot':
          api.effect.play('system://shutdown.js')
            .then(() => system.reboot())
          break
        case '/shutdown':
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
      }
    }
  }, api)
}
