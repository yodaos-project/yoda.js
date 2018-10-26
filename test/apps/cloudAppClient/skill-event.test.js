'use strict'

var test = require('tape')
var Manager = require('/opt/apps/cloudappclient/manager')
var Skill = require('/opt/apps/cloudappclient/skill')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

var eventBus = new EventEmitter()

var mockNlp = {
  'appId': 'E33FCE60E7294A61B84C43C1A171DFD8'
}
var mockAction = {
  'version': '2.0.0',
  'startWithActiveWord': false,
  'appId': 'E33FCE60E7294A61B84C43C1A171DFD8',
  'response': {
    'action': {
      'version': '2.0.0',
      'type': 'NORMAL',
      'form': 'scene',
      'shouldEndSession': false,
      'directives': []
    },
    'resType': 'EVENT',
    'respId': '0cd5d57f00a386fe0cfb4a0d345405b3'
  }
}

function Directive () {
  EventEmitter.call(this)
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
  this.appId = ''
}
inherits(Directive, EventEmitter)

Directive.prototype.execute = function execute (dt, type, cb) {
  console.log(dt)
  this.appId = dt[0].data.appId
  eventBus.emit(`execute:${this.appId}`, dt, type)
}

Directive.prototype.resume = function (type, cb) {
  eventBus.emit(`resume:${this.appId}`, type)
}

Directive.prototype.run = function run (type, cb) {
  eventBus.emit(`run:${this.appId}`, type)
}

test('skill event: skill start', t => {
  t.plan(4)
  eventBus.on('execute:appid1-cut', (dt, type) => {
    t.equal(type, 'frontend')
    t.pass('appid1-cut emit start')
  })
  var exe = new Directive()
  var manager = new Manager(exe, Skill)
  mockAction.appId = 'appid1-cut'
  mockAction.response.action.form = 'cut'
  mockAction.response.action.shouldEndSession = false
  var tts = {
    'type': 'voice',
    'action': 'PLAY',
    'disableEvent': false,
    'item': {
      'itemId': 'cas:stroy:voice:finished:4D6D76CA4F8B49D6BA8AD227B385EDDB:0602041822000129:243bd2cd063bd45715b817097ad86661:$$play_random$$2$$0$$$$5653688dc85845b89d0d53df79fdf6d4$$b00378b738164c3090fca82a145e548a$$42',
      'tts': '好的，宝儿的故事很好听，我们来听听看。'
    }
  }
  mockAction.response.action.directives.push(tts)
  manager.onrequest(mockNlp, mockAction)
  var skill = manager.skills[0]
  t.equal(skill.paused, false)
  t.equal(skill.shouldEndSession, false)
  skill.emit('exit')
})
