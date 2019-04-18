'use strict'

var Application = require('@yodaos/application').Application
var AudioFocus = require('@yodaos/application').AudioFocus
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis
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
  // Compatible for light-app
  apiInstance = api
  synth = new SpeechSynthesis(api.tts)
  return Application({
    url: function url (urlObj) {
      switch (urlObj.pathname) {
        case '/speak':
          speak(urlObj.query.text)
      }
    }
  }, api)
}
