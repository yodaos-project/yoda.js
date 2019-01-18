'use strict'

var test = require('tape')
var helper = require('../../helper')
var Skill = require(`${helper.paths.apps}/cloudappclient/skill`)

function createSkill (form, shouldEndSession) {
  var Directive = {
    execute: function (dts, ways, done) {
      done()
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
