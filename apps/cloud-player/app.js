var Application = require('@yodaos/application').Application
var flora = require('@yoda/flora')
var _ = require('@yoda/util')._
var logger = require('logger')('cloud-player')

var constant = require('./constant')
var FloraUri = constant.FloraUri

var app = Application({
  created: function created () {
    this.voices = []
    this.agent = new flora.Agent(FloraUri)
    this.agent.start()
  },
  url: function url (urlObj) {
    logger.info('received url', urlObj.href)
    var voice
    switch (urlObj.pathname) {
      case '/play': {
        this.startVoice('player', [
          urlObj.query.text, urlObj.query.url,
          _.get(urlObj.query, 'transient', '1') === '1', /** defaults to transient */
          _.get(urlObj.query, 'sequential', '0') === '1' /** defaults to sequential */
        ])
        break
      }
      case '/pause': {
        voice = this.getVoice('player')
        if (voice) {
          voice.pause()
        }
        break
      }
      case '/resume': {
        voice = this.getVoice('player')
        if (voice) {
          voice.resume()
        }
        break
      }
      case '/stop': {
        voice = this.getVoice('player')
        if (voice) {
          voice.abandon()
        }
        break
      }
      case '/play-tts-stream': {
        this.startVoice('tts-stream')
        break
      }
    }
  }
})

app.startVoice = function startVoice (name, args) {
  var voiceConstructor = require(`./voice/${name}`)
  var voice = voiceConstructor.apply(this, args || [])
  voice.name = name
  this.voices.push(voice)
  return voice
}

app.getVoice = function getVoice (name) {
  for (var idx = 0; idx < this.voices.length; ++idx) {
    var focus = this.voices[idx]
    if (focus.name === name) {
      return focus
    }
  }
}

app.finishVoice = function finishVoice (it) {
  var idx = this.voices.indexOf(it)
  if (idx < 0) {
    return
  }
  this.voices.splice(it, 1)
}

module.exports = app
