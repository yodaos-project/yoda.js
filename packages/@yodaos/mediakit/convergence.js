'use strict'

function Convergence (mediaClient) {
  this.mediaClient = mediaClient
  this.registry = {}
  this.listen()
}

Convergence.events = [ 'prepared', 'playbackcomplete', 'bufferingupdate',
  'seekcomplete', 'cancel', 'error' ]
Convergence.terminationEvents = [ 'playbackcomplete', 'cancel', 'error' ]

Convergence.prototype.listen = function () {
  var self = this
  Convergence.events.forEach(ev => {
    this.mediaClient.on(ev, function (playerId) {
      self.converge(ev, playerId, Array.prototype.slice.call(arguments, 1))
    })
  })
}

Convergence.prototype.converge = function (name, playerId, args) {
  var handler = this.registry[playerId]
  if (Convergence.terminationEvents.indexOf(name) >= 0) {
    delete this.registry[playerId]
  }
  if (typeof handler === 'function') {
    handler(name, args || [])
  }
}

Convergence.prototype.start = function (url, handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Expect a function on second argument of Convergence#start')
  }
  this.mediaClient.start(url)
    .then(playerId => {
      this.registry[playerId] = handler
      handler('resolved', playerId)
    }, err => {
      handler('error', err)
    })
}

Convergence.prototype.prepare = function (url, handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Expect a function on second argument of Convergence#prepare')
  }
  this.mediaClient.prepare(url)
    .then(playerId => {
      this.registry[playerId] = handler
      handler('resolved', playerId)
    }, err => {
      handler('error', err)
    })
}

module.exports = Convergence
