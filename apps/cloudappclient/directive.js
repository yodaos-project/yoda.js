'use strict'

var logger = require('logger')('cloudAppClient-directive')

function emptyfn () {
  // empty function
}

/**
 * @class Directive
 */
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
  logger.info('start running directive...')
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
  cb = cb || emptyfn

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

    /**
     * @param {boolean} canceled - if needs to cancel this job.
     */
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
      if (item.nowait === true) {
        self.cb[type][item.type].apply(self, [item, emptyfn])
        next()
      } else {
        self.cb[type][item.type].apply(self, [item, next])
      }
    }
  }
  handle(dt)
}

/**
 * @method do
 * @param {string} type - frontend or background.
 * @param {string} dt - the directive type.
 * @param {function} cb - the cb function.
 */
Directive.prototype.do = function (type, dt, cb) {
  this.cb[type][dt] = cb
}

exports.Directive = Directive
