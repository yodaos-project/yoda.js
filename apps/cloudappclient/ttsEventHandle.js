'use strict'

function TtsEventHandle (ttsClient) {
  this.ttsClient = ttsClient
  this.callbackHandle = {}
  this.handleEvent()
}

TtsEventHandle.prototype.handleEvent = function () {
  this.ttsClient.on('start', (ttsId) => {
    this.handle(ttsId, 'start')
  })
  this.ttsClient.on('end', (ttsId) => {
    this.handle(ttsId, 'end')
  })
  this.ttsClient.on('cancel', (ttsId) => {
    this.handle(ttsId, 'cancel')
  })
  this.ttsClient.on('error', (ttsId) => {
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
    this.callbackHandle[`ttscb:${ttsId}`] = eventHandle
  })
}

module.exports = TtsEventHandle
