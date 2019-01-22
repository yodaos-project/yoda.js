'use strict'

var logger = require('logger')('tts-kit')

function TtsConvergence (ttsClient) {
  this.ttsClient = ttsClient
  this.callbackHandle = {}
  this.isPlaying = false
  this.handleEvent()
}

TtsConvergence.terminationEvents = [
  'end',
  'cancel',
  'error'
]

TtsConvergence.prototype.handleEvent = function () {
  this.ttsClient.on('start', (ttsId) => {
    logger.info(`id:${ttsId} start`)
    this.isPlaying = true
    this.handle(ttsId, 'start')
  })
  TtsConvergence.terminationEvents.forEach(it => {
    this.ttsClient.on(it, (ttsId) => {
      logger.info(`id:${ttsId} ${it}`)
      this.isPlaying = false
      this.handle(ttsId, it)
    })
  })
}

TtsConvergence.prototype.handle = function (ttsId, name) {
  if (typeof this.callbackHandle[`ttscb:${ttsId}`] === 'function') {
    this.callbackHandle[`ttscb:${ttsId}`](name)
    if (name === 'end' || name === 'cancel' || name === 'error') {
      this.callbackHandle[`ttscb:${ttsId}`] = null
    }
  }
}

TtsConvergence.prototype.speak = function (tts, eventHandle) {
  this.ttsClient.speak(tts, {
    impatient: true
  }).then((ttsId) => {
    logger.info(`speak id:${ttsId}`)
    this.callbackHandle[`ttscb:${ttsId}`] = eventHandle
  }).catch((error) => {
    logger.error(`tts speak error: ${error}`)
    eventHandle('error')
  })
}

module.exports = TtsConvergence
