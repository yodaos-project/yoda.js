var AudioFocus = require('@yodaos/application').AudioFocus
var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var logger = require('logger')('player')

var constant = require('../constant')
var MultimediaStatusChannel = constant.MultimediaStatusChannel
var TtsStatusChannel = constant.TtsStatusChannel
var StatusCode = constant.StatusCode

module.exports = function Player (text, url, transient, sequential) {
  logger.info(`playing text(${text}) & url(${url}), transient(${transient}), sequential(${sequential})`)
  if (text == null && url == null) {
    return
  }
  var focus = new AudioFocus(transient ? AudioFocus.Type.TRANSIENT : AudioFocus.Type.DEFAULT)
  focus.resumeOnGain = false
  if (url) {
    focus.player = new MediaPlayer()
    focus.player.prepare(url)
    focus.player.on('playing', () => {
      this.agent.post(MultimediaStatusChannel, [ 0/** cloud-multimedia */, StatusCode.start ])
    })
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
      this.finishVoice(focus)
    }
  }
  focus.pause = () => {
    if (transient) {
      focus.abandon()
      return
    }
    focus.resumeOnGain = false
    speechSynthesis.cancel()
    if (focus.player) {
      focus.player.pause()
    } else {
      focus.abandon()
    }
  }
  focus.resume = () => {
    if (transient) {
      return
    }
    if (focus.player) {
      focus.request()
      focus.player.start()
    }
  }

  focus.request()
  return focus
}
