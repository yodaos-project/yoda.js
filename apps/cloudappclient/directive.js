'use strict'

var logger = require('logger')('cloudAppClient-directive')

function Directive () {
  this.frontend = []
  this.background = []
  this.cb = {
    frontend: {
      tts: function () { },
      media: function () { }
    },
    background: {
      tts: function () { },
      media: function () { }
    }
  }
}

Directive.prototype.execute = function execute (dt, type, cb) {
  this[type] = dt || []
  this.run(type, cb)
  logger.info('start run dt')
}

Directive.prototype.resume = function resume (type, cb) {
  this[type] = []
  var dt = [{
    type: 'media',
    action: 'resume',
    data: {}
  }]
  this.execute(dt, type, cb)
}

Directive.prototype.run = function run (type, cb) {
  if (this[type].length <= 0) {
    return
  }
  var self = this
  var dt = this[type].shift()
  cb = cb || () => false

  function handle (item) {
    // NOTICE: INTERNAL_EXIT is only used myself.
    // stop if current directive is INTERNAL_EXIT
    if (item.type === 'INTERNAL_EXIT') {
      logger.info('all directive complete because current dt is: INTERNAL_EXIT')
      return cb && cb()
    }
    if (self[type].length > 0) {
      dt = self[type].shift()
    } else {
      // notice: the type of _EXIT directive is used by itself
      dt = {
        type: 'INTERNAL_EXIT'
      }
    }

    function next (canceled) {
      if (canceled) {
        return cb()
      }
      handle(dt)
    }

    logger.info(`run dt: ${type} ${item.type} ${item.action || ''}`)
    if (typeof self.cb[type][item.type] !== 'function') {
      logger.info('all directive complete')
      cb()
    } else {
      self.cb[type][item.type].apply(self, [item, next])
    }
  }
  handle(dt)
}

Directive.prototype.do = function (type, dt, cb) {
  this.cb[type][dt] = cb
}

exports.Directive = Directive
