'use strict'

var test = require('tape')
var helper = require('../../helper')
var Skill = require(`${helper.paths.apps}/cloudappclient/skill`)

function createSkill (form, shouldEndSession) {
  var Directive = {
    execute: function (dts, ways, done) {
      done && done()
    }
  }
  return new Skill(Directive, {}, {
    appId: 'test',
    response: {
      action: {
        form: form || 'cut',
        shouldEndSession: shouldEndSession,
        directives: []
      }
    }
  })
}

test('test invalid protocol', (t) => {
  var skill = createSkill('cut')
  var action = {
    appId: 'test_invalid_protocol',
    response: {}
  }
  skill.onrequest(action)
  t.end()
})

test('test should end session', (t) => {
  t.plan(1)
  var skill = createSkill('cut', true)
  skill.on('exit', () => {
    t.pass('skill emit exit')
  })
  skill.emit('start')
})

test('test resume: exit should be emit', (t) => {
  var skill = createSkill('cut', false)
  skill.on('exit', () => {
    t.end()
  })
  skill.emit('resume')
})

test('test resume: exit should not be emit', (t) => {
  var skill = createSkill('cut', false)
  skill.task = 1
  skill.on('exit', () => {
    t.fail()
  })
  skill.emit('resume')
  t.end()
})

test('requestOnce should always be return', (t) => {
  var skill = createSkill('cut', false)
  skill.task = 5
  var action = {
    appId: 'test_requestOnce',
    response: {
      action: {
        directives: [{ type: 'media', action: 'PLAY' }]
      }
    }
  }
  skill.requestOnce({}, action, () => {
    t.end()
  })
})
