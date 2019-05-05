var Application = require('@yodaos/application').Application
var AudioFocus = require('@yodaos/application').AudioFocus
var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var flora = require('@yoda/flora')
var logger = require('logger')('cloud-player')

var FloraUri = 'unix:/var/run/flora.sock#cloud-player'
var GetStreamChannel = 'yodaos.apps.cloud-player.get-stream-channel'
var MultimediaStatusChannel = 'yodaos.apps.multimedia.playback-status'
var TtsStatusChannel = 'yodaos.apps.cloud-player.tts.status'

var StatusCode = {
  start: 0,
  end: 1,
  cancel: 2,
  error: 3
}

var app = Application({
  created: function created () {
    this.agent = new flora.Agent(FloraUri)
    this.agent.start()
  },
  url: function url (urlObj) {
    logger.info('received url', require('url').format(urlObj))
    switch (urlObj.pathname) {
      case '/play': {
        this.play(urlObj.query.text, urlObj.query.url, Number(urlObj.query.transient) !== 0, Number(urlObj.query.sequential) > 0)
        break
      }
      case '/play-tts-stream': {
        this.playStream()
        break
      }
    }
  }
})

app.play = function play (text, url, transient, sequential) {
  logger.info(`playing text(${text}) & url(${url}), transient(${transient}), sequential(${sequential})`)
  if (text == null && url == null) {
    return
  }
  var focus = new AudioFocus(transient ? AudioFocus.Type.TRANSIENT : AudioFocus.Type.DEFAULT)
  var utter
  var player
  var resumeOnGain = false
  if (url) {
    player = new MediaPlayer()
    player.prepare(url)
    player.on('playbackcomplete', () => {
      this.agent.post(MultimediaStatusChannel, [ 0/** cloud-multimedia */, StatusCode.end ])
    })
  }
  focus.onGain = () => {
    if (text && utter == null) {
      utter = speechSynthesis.speak(text)
        .on('start', () => {
          this.agent.post(TtsStatusChannel, [ StatusCode.start ])
          if (!sequential && player != null) {
            player && player.resume()
          }
        })
        .on('cancel', () => {
          logger.info('on cancel')
          this.agent.post(TtsStatusChannel, [ StatusCode.cancel ])
          focus.abandon()
        })
        .on('error', () => {
          logger.info('on error')
          this.agent.post(TtsStatusChannel, [ StatusCode.error ])
          focus.abandon()
        })
        .on('end', () => {
          logger.info('on end')
          this.agent.post(TtsStatusChannel, [ StatusCode.end ])
          if (sequential && player != null) {
            player.resume()
            return
          }
          focus.abandon()
        })
    } else if (text == null && player != null) {
      player.resume()
    }

    if (resumeOnGain) {
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

app.playStream = function playStream () {
  var focus = new AudioFocus(AudioFocus.Type.TRANSIENT)
  focus.onGain = () => {
    var utter = speechSynthesis.playStream()
      .on('start', () => {
        this.agent.removeMethod(GetStreamChannel)
        this.agent.post(TtsStatusChannel, [ StatusCode.start ])
      })
      .on('cancel', () => {
        logger.info('on cancel')
        this.agent.post(TtsStatusChannel, [ StatusCode.cancel ])
        focus.abandon()
      })
      .on('error', () => {
        logger.info('on error')
        this.agent.post(TtsStatusChannel, [ StatusCode.error ])
        focus.abandon()
      })
      .on('end', () => {
        logger.info('on end')
        this.agent.post(TtsStatusChannel, [ StatusCode.end ])
        focus.abandon()
      })
    this.agent.declareMethod(GetStreamChannel, (req, res) => {
      logger.info('on get stream channel', utter.id)
      res.end(0, [utter.id])
    })
  }
  focus.onLoss = () => {
    speechSynthesis.cancel()
  }
  focus.request()
}

module.exports = app
