'use strict'

var test = require('tape')
var helper = require('../../helper')
var Skill = require(`${helper.paths.apps}/cloudappclient/skill.js`)

function Directive () {
  this.execute = function (dts, ways, complete) {
    complete()
  }
}

test('test shouldEndSession', (t) => {
  t.plan(1)
  var exe = new Directive()
  exe.execute = function (dts, ways, complete) {
    complete()
  }
  var nlp = {

  }
  var action = {
    appId: 'testShouldEndSession',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: true,
        directives: []
      }
    }
  }
  var skill = new Skill(exe, nlp, action)
  skill.on('exit', () => {
    t.pass('skill emit exit')
  })
  skill.emit('start')
})
