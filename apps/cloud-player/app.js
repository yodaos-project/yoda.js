var Application = require('@yodaos/application').Application
var AudioFocus = require('@yodaos/application').AudioFocus
var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var flora = require('@yoda/flora')
var _ = require('@yoda/util')._
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
        this.play(urlObj.query.text, urlObj.query.url,
          _.get(urlObj.query, 'transient', '1') === '1', /** defaults to transient */
          _.get(urlObj.query, 'sequential', '0') === '1' /** defaults to sequential */
        )
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
  focus.resumeOnGain = false
  if (url) {
    focus.player = new MediaPlayer()
    focus.player.prepare(url)
    focus.player.on('playbackcomplete', () => {
      this.agent.post(MultimediaStatusChannel, [ 0/** cloud-multimedia */, StatusCode.end ])
      if (sequential || !speechSynthesis.speaking) {
        focus.abandon()
      }
    })
  }
  focus.onGain = () => {
    if (text && focus.utter == null) {
      focus.utter = speechSynthesis.speak(text)
        .on('start', () => {
          this.agent.post(TtsStatusChannel, [ StatusCode.start ])
          if (!sequential && focus.player != null) {
            focus.player.start()
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

          if (sequential && focus.player) {
            focus.player.start()
            return
          }
          if (focus.player && focus.player.playing) {
            return
          }
          focus.abandon()
        })
    } else if (text == null && focus.player != null) {
      focus.player.start()
    }

    if (focus.resumeOnGain && focus.player != null) {
      focus.player.start()
    }
    focus.resumeOnGain = false
  }
  focus.onLoss = (transient) => {
    if (focus.utter) {
      speechSynthesis.cancel()
    }
    if (transient) {
      focus.resumeOnGain = true
      focus.player && focus.player.pause()
    } else {
      focus.player && focus.player.stop()
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
