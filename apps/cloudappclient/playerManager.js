var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var logger = require('logger')('playerManager')

function PlayerManager () {
  EventEmitter.call(this)
  // save playerId
  this.handle = {}
  // save custom player message map to playerId
  this.data = {}
}
inherits(PlayerManager, EventEmitter)

PlayerManager.prototype.setByAppId = function (appId, playerId, data) {
  logger.log(`playerId setBy appId(${appId}) playerId(${playerId}) data(${data})`)
  if (appId === undefined || playerId === undefined) {
    return false
  }
  var pid = this.handle[appId]
  if (pid && pid !== '') {
    // The event 'change' emit when the playerId of given appId changes.
    // pm.on('change', appId, old_pid, new_pid)
    this.emit('change', appId, pid, playerId)
  }
  // delete data avoid memory leaks
  if (this.data[pid]) {
    delete this.data[pid]
  }
  this.handle[appId] = playerId
  if (data !== undefined) {
    this.data[playerId] = data
  }
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

PlayerManager.prototype.getDataByPlayerId = function (playerId) {
  if (playerId === undefined) {
    return null
  }
  return this.data[playerId]
}

PlayerManager.prototype.setDataByPlayerId = function (playerId, data) {
  if (playerId === undefined) {
    return
  }
  this.data[playerId] = data
}

PlayerManager.prototype.deleteByAppId = function (appId) {
  var pid = this.handle[appId]
  if (this.handle[appId]) {
    delete this.handle[appId]
  }
  // Avoid memory leaks
  if (pid && this.data[pid]) {
    delete this.data[pid]
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
  this.data = {}
  this.handle = {}
  this.emit('update', this.handle)
  return res
}

module.exports = PlayerManager
