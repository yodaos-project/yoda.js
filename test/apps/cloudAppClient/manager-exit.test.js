'use strict'

var test = require('tape')
var Manager = require('/opt/apps/cloudappclient/manager')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var MockDirective = require('./mock-directive')

var eventBus = new EventEmitter()

function Skill (exe, nlp, action) {
  EventEmitter.call(this)
  this.appId = action.appId
  this.form = action.response.action.form
  this.shouldEndSession = action.response.action.shouldEndSession
  this.directives = []
  this.paused = false
  this.task = 0
  this.exe = exe
  this.handleEvent()
  this.transform(action.response.action.directives || [])
}
inherits(Skill, EventEmitter)

Skill.prototype.onrequest = function (action, append) {
  if (this.paused === false) {
    this.emit('start')
  }
}

Skill.prototype.handleEvent = function () {
  this.on('start', () => {
    eventBus.emit(`start:${this.appId}`)
  })
  this.on('pause', () => {
    eventBus.emit(`pause:${this.appId}`)
  })
  this.on('resume', () => {
    eventBus.emit(`resume:${this.appId}`)
  })
  this.on('destroy', () => {
    eventBus.emit(`destroy:${this.appId}`)
  })
}

Skill.prototype.requestOnce = function (nlp, action, callback) {
  callback()
}

Skill.prototype.transform = function (directives, append) {

}

test('test EXIT: requestOnce\'s should called after execute directive', (t) => {
  t.plan(1)
  var exe = new MockDirective()
  var manager = new Manager(exe, Skill)

  eventBus.on('start:appid1', () => {
    t.fail('appid1 should not emit start event')
  })

  manager.onrequestOnce({
    appId: 'appid1'
  }, {
    appId: 'appid1',
    response: {
      action: {
        shouldEndSession: false,
        form: 'cut',
        directives: [{
          type: 'test'
        }]
      }
    }
  }, () => {
    t.pass('requestOnce should called')
  })
})
