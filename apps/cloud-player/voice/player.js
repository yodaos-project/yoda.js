var AudioFocus = require('@yodaos/application').AudioFocus
var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var logger = require('logger')('player')

var constant = require('../constant')
var MultimediaStatusChannel = constant.MultimediaStatusChannel
var TtsStatusChannel = constant.TtsStatusChannel
var StatusCode = constant.StatusCode

module.exports = function Player (text, url, transient, sequential, tag) {
  logger.info(`playing text(${text}) & url(${url}), transient(${transient}), sequential(${sequential})`)
  if (text == null && url == null) {
    return
  }
  var focus = new AudioFocus(transient ? AudioFocus.Type.TRANSIENT : AudioFocus.Type.DEFAULT)
  focus.resumeOnGain = true
  if (url) {
    focus.player = new MediaPlayer()
    focus.player.prepare(url)
    focus.player.on('playing', () => {
      this.agent.post(MultimediaStatusChannel, [ StatusCode.start, tag ])
    })
    focus.player.on('playbackcomplete', () => {
      focus.player.playbackComplete = true
      this.agent.post(MultimediaStatusChannel, [ StatusCode.end, tag ])
      if (sequential || !speechSynthesis.speaking) {
        focus.abandon()
      }
    })
    focus.player.on('error', (err) => {
      logger.error('unexpected player error', err.stack)
      if (sequential || !speechSynthesis.speaking) {
        focus.abandon()
      }
    })
  }
  focus.onGain = () => {
    logger.info(`focus gain, transient? ${transient}, player? ${focus.player == null}, resumeOnGain? ${focus.resumeOnGain}`)
    if (text && focus.utter == null) {
      /** on first gain */
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
    } else if (focus.resumeOnGain && focus.player != null) {
      focus.player.start()
    }

    focus.resumeOnGain = false
  }
  focus.onLoss = (transient) => {
    logger.info(`focus lost, transient? ${transient}, player? ${focus.player == null}`)
    if (focus.utter) {
      speechSynthesis.cancel()
    }
    if (!transient || focus.player == null) {
      if (focus.player && !focus.player.playbackComplete) {
        this.agent.post(MultimediaStatusChannel, [ StatusCode.cancel, tag ])
      }
      focus.player && focus.player.stop()
      this.finishVoice(focus)
      return
    }
    if (!focus.player.playing) {
      return
    }
    focus.resumeOnGain = true
    focus.player.pause()
  }
  focus.pause = () => {
    logger.info(`pausing, transient? ${transient}, player? ${focus.player == null}, state? ${focus.state}`)
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
    logger.info(`resuming, transient? ${transient}, player? ${focus.player == null}, state? ${focus.state}`)
    if (transient) {
      return
    }
    if (focus.player == null) {
      return
    }
    if (focus.state === AudioFocus.State.ACTIVE) {
      focus.player.start()
      return
    }
    focus.resumeOnGain = true
    focus.request()
  }
  focus.seekTo = (pos) => {
    logger.info(`seeking, player? ${focus.player == null}, to ${pos}`)
    if (focus.player == null) {
      return
    }
    focus.player.seekTo(pos)
    focus.resume()
  }
  focus.seekBy = (delta) => {
    logger.info(`seeking, player? ${focus.player == null}, by delta ${delta}`)
    if (focus.player == null) {
      return
    }
    var pos = focus.player.position
    if (pos < 0) {
      return
    }
    pos = pos + delta
    if (pos < 0) {
      pos = 0
    }
    focus.seekTo(pos)
  }
  focus.setSpeed = (speed) => {
    logger.info(`resuming, player? ${focus.player == null}, speed ${speed}`)
    if (focus.player == null) {
      return
    }
    focus.player.setSpeed(speed)
    focus.resume()
  }

  focus.request()
  return focus
}
