'use strict'

var logger = require('logger')('cloudAppClient-tts-handle')

function TtsEventHandle (ttsClient) {
  this.ttsClient = ttsClient
  this.callbackHandle = {}
  this.handleEvent()
}

TtsEventHandle.prototype.handleEvent = function () {
  this.ttsClient.on('start', (ttsId) => {
    logger.info(`id:${ttsId} start`)
    this.handle(ttsId, 'start')
  })
  this.ttsClient.on('end', (ttsId) => {
    logger.info(`id:${ttsId} end`)
    this.handle(ttsId, 'end')
  })
  this.ttsClient.on('cancel', (ttsId) => {
    logger.info(`id:${ttsId} cancel`)
    this.handle(ttsId, 'cancel')
  })
  this.ttsClient.on('error', (ttsId) => {
    logger.info(`id:${ttsId} error`)
    this.handle(ttsId, 'error')
  })
}

TtsEventHandle.prototype.handle = function (ttsId, name) {
  if (typeof this.callbackHandle[`ttscb:${ttsId}`] === 'function') {
    this.callbackHandle[`ttscb:${ttsId}`](name)
    if (name === 'end' || name === 'cancel' || name === 'error') {
      this.callbackHandle[`ttscb:${ttsId}`] = null
    }
  }
}

TtsEventHandle.prototype.speak = function (tts, eventHandle) {
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

module.exports = TtsEventHandle
