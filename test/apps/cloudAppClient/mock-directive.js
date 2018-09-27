'use strict'

var logger = require('logger')('mock-directive')

function MockDirective () {
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

MockDirective.prototype.execute = function execute (dt, type, cb) {
  logger.info('directive execute')
}

MockDirective.prototype.stop = function (type, cb) {
  logger.info('directive stop')
}

MockDirective.prototype.resume = function (type, cb) {
  logger.info('directive resume')
}

MockDirective.prototype.run = function run (type, cb) {
  logger.info('directive run')
}

MockDirective.prototype.do = function (type, dt, cb) {
  this.cb[type][dt] = cb
}

module.exports = MockDirective
