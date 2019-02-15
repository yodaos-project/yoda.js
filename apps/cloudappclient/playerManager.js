var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var logger = require('logger')('playerManager')

function PlayerManager () {
  EventEmitter.call(this)
  this.handle = {}
}
inherits(PlayerManager, EventEmitter)

PlayerManager.prototype.setByAppId = function (appId, playerId) {
  logger.log(`playerId setBy appId(${appId}) playerId(${playerId})`)
  if (appId === undefined || playerId === undefined) {
    return false
  }
  if (this.handle[appId] && this.handle[appId] !== '') {
    var pid = this.handle[appId]
    // The event 'change' emit when the playerId of given appId changes.
    // pm.on('change', appId, old_pid, new_pid)
    this.emit('change', appId, pid, playerId)
  }
  this.handle[appId] = playerId
  // The event 'update' emit when handle was changed.
  this.emit('update', this.handle)
  return true
}

PlayerManager.prototype.getByAppId = function (appId) {
  if (appId === undefined) {
    return null
  }
  return this.handle[appId]
}

PlayerManager.prototype.deleteByAppId = function (appId) {
  if (this.handle[appId]) {
    delete this.handle[appId]
  }
  this.emit('update', this.handle)
  return true
}

PlayerManager.prototype.clear = function () {
  var res = []
  var keys = Object.keys(this.handle)
  keys.forEach((appId) => {
    res.push(this.handle[appId])
    delete this.handle[appId]
  })
  this.handle = {}
  this.emit('update', this.handle)
  return res
}

module.exports = PlayerManager
