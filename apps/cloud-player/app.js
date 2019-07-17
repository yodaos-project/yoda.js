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
    this.agent.declareMethod(constant.InspectPlayerChannel, (req, res) => {
      res.end(0, this.inspectPlayers())
    })
  },
  url: function url (urlObj) {
    logger.info('received url', urlObj.href)
    var voice
    switch (urlObj.pathname) {
      case '/play': {
        voice = this.startVoice('player', [
          urlObj.query.text, urlObj.query.url,
          _.get(urlObj.query, 'transient', '1') === '1', /** defaults to transient */
          _.get(urlObj.query, 'sequential', '0') === '1', /** defaults to sequential */
          urlObj.query.tag
        ])
        voice.tag = urlObj.query.tag
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
      case '/seek': {
        var pos = Number(urlObj.query.to)
        var by = Number(urlObj.query.by)
        voice = this.getVoice('player')
        if (voice == null) {
          break
        }
        if (!isNaN(pos) || pos >= 0) {
          voice.seekTo(pos)
          break
        }
        if (!isNaN(by)) {
          voice.seekBy(by)
          break
        }
        break
      }
      case '/set-speed': {
        var speed = Number(urlObj.query.speed)
        if (isNaN(speed) || speed < 0) {
          break
        }
        voice = this.getVoice('player')
        if (voice) {
          voice.setSpeed(speed)
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
        this.startVoice('tts-stream', [
          _.get(urlObj.query, 'pickupOnEnd', '0') === '1',
          Number(_.get(urlObj.query, 'pickupDuration', '0'))
        ])
        break
      }
    }
  }
})

app.inspectPlayers = function inspectPlayers () {
  return this.voices
    .filter(it => it.name === 'player')
    .map(it => ([
      it.tag,
      [ 'duration', _.get(it, 'player.duration') ],
      [ 'position', _.get(it, 'player.position') ],
      [ 'playing', _.get(it, 'player.playing') ? 1 : 0 ]
    ]))
}

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
  this.voices.splice(idx, 1)
}

module.exports = app
