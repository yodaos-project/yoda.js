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
    this.emit('change', appId, pid)
  }
  this.handle[appId] = playerId
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
  return res
}

module.exports = PlayerManager
