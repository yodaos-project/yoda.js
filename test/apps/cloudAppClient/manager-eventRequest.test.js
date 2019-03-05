'use strict'

var test = require('tape')
var helper = require('../../helper')
var EventEmitter = require('events')
var Manager = require(`${helper.paths.apps}/cloudappclient/manager.js`)
var Skill = require(`${helper.paths.apps}/cloudappclient/skill`)
var eventRequestMap = require(`${helper.paths.apps}/cloudappclient/eventRequestMap.json`)

// todo: This is a temporary plan. For httpsession's bug.
var http = require('@yoda/httpsession')

class EventRequest extends EventEmitter {
  ttsEvent (name, appId, itemId, cb) {
    cb(null, '{}')
    this.emit(`tts-${appId}-${name}`, itemId)
  }

  mediaEvent (name, appId, extra, cb) {
    cb(null, '{}')
    this.emit(`media-${appId}-${name}`, extra)
  }
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
  var pm = new Manager(null, Skill)
  // In order to achieve the purpose of our testing, we need to intercept the real request.
  pm.eventRequest = eventBus
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
  var pm = new Manager(null, Skill)
  // In order to achieve the purpose of our testing, we need to intercept the real request.
  pm.eventRequest = eventBus
  pm.skills = [skill]

  var name = eventRequestMap['tts']['cancel']
  eventBus.on(`tts-testAppId-${name}`, () => {
    t.fail(`The event: ${name} should not be send to cloud.`)
  })
  pm.sendEventRequest('tts', 'cancel', { appId: 'testAppId' }, {})
  t.end()
})

test('todo: This is a temporary plan. For httpsession\'s bug. In order to close httpsession.', (t) => {
  http.abort()
  t.end()
})
