var Application = require('@yodaos/application').Application
var AudioFocus = require('@yodaos/application').AudioFocus
var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var flora = require('@yoda/flora')
var AudioManager = require('@yoda/audio').AudioManager
var logger = require('logger')('cloud-player')
var agent = new flora.Agent('unix:/var/run/flora.sock#cloud-player')
agent.start()
AudioManager.setVolume(100)

var GetStreamChannel = 'yodaos.apps.cloud-player.get-stream-channel'

function play (text, url, transient) {
  logger.info(`playing text(${text}) & url(${url})`)
  var focus = new AudioFocus()
  var utter
  var player
  var resumeOnGain = true
  if (url) {
    player = new MediaPlayer()
    player.prepare(url)
  }
  focus.onGain = () => {
    if (text && utter == null) {
      utter = speechSynthesis.speak(text)
        .on('start', () => player && player.resume())
        .on('cancel', () => {
          logger.info('on cancel')
          focus.abandon()
        })
        .on('error', () => {
          logger.info('on error')
          focus.abandon()
        })
        .on('end', () => {
          logger.info('on end')
          focus.abandon()
        })
    } else if (resumeOnGain) {
      player && player.resume()
    }
    resumeOnGain = false
  }
  focus.onLoss = (transient) => {
    if (utter) {
      speechSynthesis.cancel()
    }
    if (transient) {
      resumeOnGain = true
      player && player.pause()
    } else {
      player && player.stop()
    }
  }
  focus.request()
}

function playStream () {
  var focus = new AudioFocus(AudioFocus.Type.Transient)
  focus.onGain = () => {
    var utter = speechSynthesis.playStream()
      .on('start', () => {
        agent.removeMethod(GetStreamChannel)
      })
      .on('cancel', () => {
        logger.info('on cancel')
        focus.abandon()
      })
      .on('error', () => {
        logger.info('on error')
        focus.abandon()
      })
      .on('end', () => {
        logger.info('on end')
        focus.abandon()
      })
    agent.declareMethod(GetStreamChannel, (req, res) => {
      logger.info('on get stream channel', utter.id)
      res.end(0, [utter.id])
    })
  }
  focus.onLoss = () => {
    speechSynthesis.cancel()
  }
  focus.request()
}

module.exports = Application({
  url: function url (urlObj) {
    logger.info('received url', require('url').format(urlObj))
    switch (urlObj.pathname) {
      case '/play': {
        play(urlObj.query.text, urlObj.query.url, urlObj.query.transient)
        break
      }
      case '/play-tts-stream': {
        playStream()
        break
      }
    }
  }
})
