var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var logger = require('logger')('multimediaService')

function MultiMedia (options) {
  EventEmitter.call(this)
  this.handle = {}
  this.options = options
}
inherits(MultiMedia, EventEmitter)

MultiMedia.prototype.start = function (appId, url) {
  return new Promise((resolve, reject) => {
    this.options.permit.invoke('check', [appId, 'ACCESS_MULTIMEDIA'])
      .then((res) => {
        if (res && res['0'] === 'true') {
          if (this.handle[appId]) {
            this.handle[appId].stop()
          }
          var player = new this.options.Multimedia()
          this.listenEvent(player)
          player.start(url)
          this.handle[appId] = player
          resolve('' + player.id)
        } else {
          reject(new Error('permission deny'))
        }
      })
      .catch((err) => {
        logger.log('multimedia play error', appId, url, err)
        reject(new Error('can not connect to vui'))
      })
  })
}

MultiMedia.prototype.stop = function (appId) {
  if (this.handle[appId]) {
    this.handle[appId].stop()
    delete this.handle[appId]
  }
}

MultiMedia.prototype.pause = function (appId) {
  if (this.handle[appId]) {
    this.handle[appId].pause()
  }
}

MultiMedia.prototype.resume = function (appId) {
  if (this.handle[appId] && !this.handle[appId].playing) {
    this.handle[appId].resume()
  }
}

MultiMedia.prototype.getPosition = function (appId) {
  if (this.handle[appId]) {
    return this.handle[appId].position
  }
  return -1
}

MultiMedia.prototype.getLoopMode = function (appId) {
  if (this.handle[appId]) {
    return this.handle[appId].loopMode
  }
  return false
}

MultiMedia.prototype.setLoopMode = function (appId, mode) {
  if (this.handle[appId]) {
    this.handle[appId].loopMode = mode === 'true'
  }
}

MultiMedia.prototype.seek = function (appId, position, callback) {
  if (this.handle[appId]) {
    this.handle[appId].seek(position, callback)
  } else {
    callback(new Error('player instance not found'))
  }
}

MultiMedia.prototype.listenEvent = function (player) {
  player.on('prepared', () => {
    this.emit('prepared', '' + player.id, '' + player.duration, '' + player.position)
  })
  player.on('playbackcomplete', () => {
    this.emit('playbackcomplete', '' + player.id)
  })
  player.on('bufferingupdate', () => {
    this.emit('bufferingupdate', '' + player.id)
  })
  player.on('seekcomplete', () => {
    this.emit('seekcomplete', '' + player.id)
  })
  player.on('error', () => {
    this.emit('error', '' + player.id)
  })
}

module.exports = MultiMedia
