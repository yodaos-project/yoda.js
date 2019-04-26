var Application = require('@yodaos/application').Application
var AudioFocus = require('@yodaos/application').AudioFocus
var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var flora = require('@yoda/flora')
var logger = require('logger')('cloud-player')
var agent = new flora.Agent('unix:/var/run/flora.sock#cloud-player')
agent.start()

var GetStreamChannel = 'yodaos.apps.cloud-player.get-stream-channel'

function play (text, url, transient, sequential) {
  logger.info(`playing text(${text}) & url(${url}), transient(${transient}), sequential(${sequential})`)
  var focus = new AudioFocus(transient ? AudioFocus.Type.TRANSIENT : AudioFocus.Type.DEFAULT)
  var utter
  var player
  var resumeOnGain = false
  if (url) {
    player = new MediaPlayer()
    player.prepare(url)
    player.on('playbackcomplete', () => {
      agent.post('yodaos.voice-interface.multimedia.next-url', [])
    })
  }
  focus.onGain = () => {
    if (text && utter == null) {
      utter = speechSynthesis.speak(text)
        .on('start', () => {
          if (!sequential && player != null) {
            player && player.resume()
          }
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
          if (sequential && player != null) {
            player.resume()
            return
          }
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
  var focus = new AudioFocus(AudioFocus.Type.TRANSIENT)
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
        play(urlObj.query.text, urlObj.query.url, Number(urlObj.query.transient) !== 0, Number(urlObj.query.sequential) > 0)
        break
      }
      case '/play-tts-stream': {
        playStream()
        break
      }
    }
  }
})
