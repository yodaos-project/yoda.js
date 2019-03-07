'use strict'

function Convergence (mediaClient, logger) {
  this.mediaClient = mediaClient
  if (logger == null) {
    logger = {
      info: function () {}
    }
  }
  this.logger = logger
  this.registry = {}
  this.listen()
  this.url = {}
  this.curPlayerId = ''
  this.eventQueue = {}
}

Convergence.events = [ 'prepared', 'paused', 'resumed', 'playbackcomplete', 'bufferingupdate',
  'seekcomplete', 'cancel', 'error', 'speedchange' ]
Convergence.terminationEvents = [ 'playbackcomplete', 'cancel', 'error' ]

Convergence.prototype.listen = function () {
  var self = this
  Convergence.events.forEach(ev => {
    this.mediaClient.on(ev, function (playerId) {
      self.logger.info(`[convergence] ${ev}(${playerId})`)
      self.converge(ev, playerId, Array.prototype.slice.call(arguments, 1))
    })
  })
}

Convergence.prototype.converge = function (name, playerId, args) {
  var handler = this.registry[playerId]
  if (Convergence.terminationEvents.indexOf(name) >= 0) {
    delete this.registry[playerId]
    delete this.url[playerId]
  }
  /**
   * when media resumed, also must set playerid
   * since before resumed,this.curPlayerId may have changed
   */
  if (name === 'resumed') {
    this.curPlayerId = playerId
  }
  if (handler == null) {
    this.logger.info(`[convergence] no handler listening on ${name}(${playerId}), enqueueing.`)
    if (this.eventQueue[playerId] == null) {
      this.eventQueue[playerId] = []
    }
    this.eventQueue[playerId].push({ name: name, args: args })
    return
  }
  if (typeof handler !== 'function') {
    throw new Error(`Unexpected non-function handler on converge ${name}(${playerId})`)
  }
  this.processQueuedEvents(handler, playerId)
  handler(name, args || [])
}

Convergence.prototype.processQueuedEvents = function processQueuedEvents (handler, playerId) {
  if (this.eventQueue[playerId] != null) {
    var queue = this.eventQueue[playerId]
    this.logger.info(`[convergence] processing queued events for player ${playerId}.`,
      queue.map(it => it.name))
    /**
     * prevent leaking of terminated player events
     * since a client could only have one opening player at a time.
     */
    this.eventQueue = {}
    queue.forEach(it => {
      try {
        handler(it.name, it.args || [])
      } catch (err) {
        process.nextTick(() => {
          /** rethrow errors in next tick
           * since Convergence doesn't care what's going wrong in handlers.
           */
          throw err
        })
      }
    })
  }
}

Convergence.prototype.start = function (url, options, handler) {
  if (typeof options === 'function') {
    handler = options
    options = {
      multiple: false
    }
  }
  if (typeof handler !== 'function') {
    throw new TypeError('Expect a function on second argument of Convergence#start')
  }
  this.mediaClient.start(url, options)
    .then(playerId => {
      this.url[playerId] = url
      this.curPlayerId = playerId
      this.logger.info('[convergence] resolved Convergence.start with playerId', playerId)
      this.registry[playerId] = handler
      handler('resolved', playerId)
      this.processQueuedEvents(handler, playerId)
    }, err => {
      handler('error', err)
    })
}

Convergence.prototype.prepare = function (url, options, handler) {
  if (typeof options === 'function') {
    handler = options
    options = {
      multiple: false
    }
  }
  if (typeof handler !== 'function') {
    throw new TypeError('Expect a function on second argument of Convergence#prepare')
  }
  this.mediaClient.prepare(url, options)
    .then(playerId => {
      this.logger.info('[convergence] resolved Convergence.prepare with playerId', playerId)
      this.registry[playerId] = handler
      handler('resolved', playerId)
      this.processQueuedEvents(handler, playerId)
    }, err => {
      handler('error', err)
    })
}

Convergence.prototype.getUrl = function () {
  return this.url[this.curPlayerId]
}

module.exports = Convergence
