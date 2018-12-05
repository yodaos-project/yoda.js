'use strict'

var flora = require('@yoda/flora')

var defaultConfig = {
  'uri': 'unix:/var/run/flora.sock',
  'bufsize': 0,
  'reconnInterval': 10000
}

function FloraComp () {
}

FloraComp.prototype.init = function (fid, config) {
  if (typeof fid !== 'string') {
    fid = ''
  }
  if (typeof config !== 'object') {
    config = defaultConfig
  }
  this.agent = new flora.Agent(config.uri + '#' + fid,
    config.reconnInterval, config.bufsize)

  if (typeof this.handlers === 'object') {
    Object.keys(this.handlers).forEach((key) => {
      var cb = this.handlers[key]
      if (typeof cb === 'function') {
        this.agent.subscribe(key, cb.bind(this))
      }
    })
    this.agent.start()
  }
}

FloraComp.prototype.destruct = function () {
  if (this.agent instanceof flora.Agent) {
    this.agent.close()
  }
}

FloraComp.prototype.post = function (name, msg, type) {
  if (this.agent instanceof flora.Agent) {
    return this.agent.post(name, msg, type)
  }
  return flora.ERROR_NOT_CONNECTED
}

module.exports = FloraComp
