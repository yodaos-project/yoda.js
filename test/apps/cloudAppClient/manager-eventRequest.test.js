'use strict'

var test = require('tape')
var helper = require('../../helper')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var Manager = require(`${helper.paths.apps}/cloudappclient/manager.js`)
var Skill = require(`${helper.paths.apps}/cloudappclient/skill`)
var eventRequestMap = require(`${helper.paths.apps}/cloudappclient/eventRequestMap.json`)

function EventRequest () {
  EventEmitter.call(this)
}
inherits(EventRequest, EventEmitter)

EventRequest.prototype.ttsEvent = function (name, appId, itemId, cb) {
  var res = '{}'
  cb(res)
  this.emit(`tts-${appId}-${name}`, itemId)
}

EventRequest.prototype.mediaEvent = function (name, appId, extra, cb) {
  var res = '{}'
  cb(res)
  this.emit(`media-${appId}-${name}`, extra)
}

test('test manager-eventRequest: media cancel', (t) => {
  t.plan(1)
  var skill = new Skill({}, {}, {
    appId: 'testAppId',
    response: {
      action: {}
    }
  })
  var eventBus = new EventRequest()
  var pm = new Manager(null, Skill, eventBus)
  pm.skills = [skill]

  var name = eventRequestMap['media']['cancel']
  eventBus.on(`media-testAppId-${name}`, () => {
    t.pass(`The event: ${name} should be send to cloud.`)
  })
  pm.sendEventRequest('media', 'cancel', { appId: 'testAppId' }, {})
})

test('test manager-eventRequest: tts cancel', (t) => {
  var skill = new Skill({}, {}, {
    appId: 'testAppId',
    response: {
      action: {}
    }
  })
  var eventBus = new EventRequest()
  var pm = new Manager(null, Skill, eventBus)
  pm.skills = [skill]

  var name = eventRequestMap['tts']['cancel']
  eventBus.on(`tts-testAppId-${name}`, () => {
    t.fail(`The event: ${name} should not be send to cloud.`)
  })
  pm.sendEventRequest('tts', 'cancel', { appId: 'testAppId' }, {})
  t.end()
})
