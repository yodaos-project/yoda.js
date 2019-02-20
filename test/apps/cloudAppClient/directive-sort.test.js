'use strict'

var test = require('tape')
var Skill = require('/opt/apps/cloudappclient/skill')

test('test directive sort', function (t) {
  t.plan(1)
  var skill = new Skill({}, {}, {
    appId: 'testAppId',
    response: {
      action: {}
    }
  })
  var dts = [{
    type: 'voice',
    action: 'pause'
  }, {
    type: 'native'
  }, {
    type: 'pickup'
  }, {
    type: 'media',
    action: 'stop'
  }]

  skill.transform(dts)

  assert(t, skill.directives.map((dt) => dt.type), ['native', 'tts', 'media', 'pickup'], 'The directve order should always be: native, tts, media, pickup')
})

test('test directive sort unknow', function (t) {
  t.plan(1)
  var skill = new Skill({}, {}, {
    appId: 'testAppId',
    response: {
      action: {}
    }
  })
  var dts = [{
    type: 'voice',
    action: 'pause'
  }, {
    type: 'native'
  }, {
    type: 'unknow'
  }, {
    type: 'pickup'
  }, {
    type: 'media',
    action: 'stop'
  }]

  skill.transform(dts)

  assert(t, skill.directives.map((dt) => dt.type), ['native', 'tts', 'media', 'pickup'], 'The unknown directve should be ignore and remove')
})

function assert (t, actual, expected, msg) {
  t.strictEqual(actual.join(''), expected.join(''), msg)
}
