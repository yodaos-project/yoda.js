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
  var furi
  if (typeof config !== 'object') {
    config = defaultConfig
  }
  if (typeof fid !== 'string') {
    furi = config.uri
  } else {
    furi = config.uri + '#' + fid
  }
  this.agent = new flora.Agent(furi, config)

  if (typeof this.handlers === 'object') {
    Object.keys(this.handlers).forEach((key) => {
      var cb = this.handlers[key]
      if (typeof cb === 'function') {
        this.agent.subscribe(key, cb.bind(this))
      }
    })
  }

  if (typeof this.remoteMethods === 'object') {
    Object.keys(this.remoteMethods).forEach((key) => {
      var cb = this.remoteMethods[key]
      if (typeof cb === 'function') {
        this.agent.declareMethod(key, cb.bind(this))
      }
    })
  }

  this.agent.start()
}

FloraComp.prototype.deinit = function () {
  if (this.agent instanceof flora.Agent) {
    this.agent.close()
  }
}

FloraComp.prototype.post = function (name, msg, type, opts) {
  if (this.agent instanceof flora.Agent) {
    return this.agent.post(name, msg, type, opts)
  }
  return flora.ERROR_NOT_CONNECTED
}

module.exports = FloraComp
