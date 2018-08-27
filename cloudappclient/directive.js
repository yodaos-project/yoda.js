'use strict'

function Directive () {
  this.frontend = []
  this.background = []
  this.cb = {
    frontend: {
      tts: function () {},
      media: function () {}
    },
    background: {
      tts: function () {},
      media: function () {}
    }
  }
}

Directive.prototype.execute = function execute (dt, type, cb) {
  this[type] = dt || []
  this.run(type, cb)
  console.log('start run dt')
}

Directive.prototype.stop = function (type, cb) {
  this[type] = []
  var dt = [{
    type: 'tts',
    action: 'cancel',
    data: {}
  }, {
    type: 'media',
    action: 'cancel',
    data: {}
  }]
  this.execute(dt, type, cb)
}

Directive.prototype.resume = function (type, cb) {
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
  function handle (next) {
    if (self[type].length > 0) {
      dt = self[type].shift()
    } else {
      dt = {
        type: ''
      }
    }
    if (next.type === 'tts') {
      console.log('run tts ' + type, typeof self.cb[type].tts)
      self.cb[type].tts.call(self, next, function () {
        handle(dt)
      })
    } else if (next.type === 'media') {
      console.log('run media ' + type, typeof self.cb[type].media)
      self.cb[type].media.call(self, next, function () {
        handle(dt)
      })
    } else if (next.type === 'confirm') {
      self.cb[type].confirm.call(self, next, function () {
        handle(dt)
      })
    } else if (next.type === 'pickup') {
      self.cb[type].pickup.call(self, next, function () {
        handle(dt)
      })
    } else {
      console.log('all directive complete')
      cb && cb()
    }
  }
  handle(dt)
}

Directive.prototype.do = function (type, dt, cb) {
  this.cb[type][dt] = cb
}

exports.Directive = Directive
