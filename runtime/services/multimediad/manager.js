var logger = require('logger')('instanceManager')

function Manager () {
  this.handle = {}
}

Manager.prototype.appendByAppId = function (appId, player) {
  logger.log(`[pm] player(${appId}, ${player.id}) append`)
  if (this.handle[appId]) {
    this.handle[appId].push(player)
  } else {
    this.handle[appId] = [player]
  }
}

Manager.prototype.deleteAllByAppId = function (appId) {
  if (this.handle[appId] && this.handle[appId].length > 0) {
    this.handle[appId].forEach(elem => {
      try {
        elem.stop()
      } catch (err) {
        logger.error(`stop playe:${elem.id} error in deleteAllByAppId()`)
      }
    })
  }
  this.handle[appId] = []
}

Manager.prototype.deleteByAppId = function (appId, playerId) {
  var handle = this.handle[appId] || []
  for (var i = 0; i < handle.length; i++) {
    if (handle[i].id === playerId) {
      handle.splice(i, 1)
      return
    }
  }
}

Manager.prototype.reset = function () {
  var keys = Object.keys(this.handle)
  var idx
  for (idx = 0; idx < keys.length; ++idx) {
    var appId = keys[idx]
    this.handle[appId].forEach(elem => {
      try {
        elem.stop()
      } catch (err) {
        logger.error(`stop player:${elem.id} error in reset()`)
      }
    })
  }
}

Manager.prototype.getNumbers = function (appId, playerId) {
  if (this.handle[appId] === undefined) {
    return 0
  }
  if (playerId === undefined || playerId < 0) {
    return this.handle[appId].length
  }
  var count = 0
  this.handle[appId].forEach((elem) => {
    if (elem.id === playerId) {
      count++
    }
  })
  return count
}

Manager.prototype.find = function (appId, playerId) {
  if (this.handle[appId] === undefined) {
    return []
  }
  if (playerId === undefined || playerId < 0) {
    return this.handle[appId]
  }
  var ret = []
  this.handle[appId].forEach((elem) => {
    if (elem.id === playerId) {
      ret.push(elem)
    }
  })
  return ret
}

Manager.prototype.getCurrentlyPlayingAppId = function () {
  var keys = Object.keys(this.handle)
  var idx, pidx
  for (idx = 0; idx < keys.length; ++idx) {
    var appId = keys[idx]
    var handle = this.handle[appId]
    for (pidx = 0; pidx < handle.length; ++pidx) {
      if (handle[pidx].playing) {
        return appId
      }
    }
  }
  return null
}

module.exports = Manager
