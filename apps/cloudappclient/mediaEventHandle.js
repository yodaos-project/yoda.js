'use strict'

var logger = require('logger')('cloudapp-media-handle')

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
  this.mediaClient.on('cancel', (mediaId) => {
    this.handle(mediaId, 'cancel')
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
    if (name === 'playbackcomplete' || name === 'error' || name === 'cancel') {
      logger.info(`deleted mediacb handler ${mediaId}`)
      delete this.callbackHandle[`mediacb:${mediaId}`]
    }
  }
}

MediaEventHandle.prototype.start = function (url, eventHandle) {
  this.mediaClient.start(url)
    .then((mediaId) => {
      this.callbackHandle[`mediacb:${mediaId}`] = eventHandle
    })
    .catch((error) => {
      logger.error(`media play ${url} error: ${error}`)
      eventHandle('error')
    })
}

module.exports = MediaEventHandle
