'use strict'

function MediaEventHandle (mediaClient) {
  this.mediaClient = mediaClient
  this.callbackHandle = {}
  this.handleEvent()
}

MediaEventHandle.prototype.handleEvent = function () {
  var self = this
  this.mediaClient.on('prepared', function (mediaId) {
    self.handle(mediaId, 'prepared', Array.prototype.slice.call(arguments, 1))
  })
  this.mediaClient.on('playbackcomplete', (mediaId) => {
    this.handle(mediaId, 'playbackcomplete')
  })
  this.mediaClient.on('bufferingupdate', (mediaId) => {
    this.handle(mediaId, 'bufferingupdate')
  })
  this.mediaClient.on('seekcomplete', (mediaId) => {
    this.handle(mediaId, 'seekcomplete')
  })
  this.mediaClient.on('error', (mediaId) => {
    this.handle(mediaId, 'error')
  })
}

MediaEventHandle.prototype.handle = function (mediaId, name, args) {
  if (typeof this.callbackHandle[`mediacb:${mediaId}`] === 'function') {
    this.callbackHandle[`mediacb:${mediaId}`](name, args || [])
    if (name === 'playbackcomplete' || name === 'error') {
      this.callbackHandle[`mediacb:${mediaId}`] = null
    }
  }
}

MediaEventHandle.prototype.start = function (url, eventHandle) {
  this.mediaClient.start(url)
    .then((mediaId) => {
      this.callbackHandle[`mediacb:${mediaId}`] = eventHandle
    })
}

module.exports = MediaEventHandle
