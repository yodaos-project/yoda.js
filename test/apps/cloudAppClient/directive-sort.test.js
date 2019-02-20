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
    type: 'tts',
    action: 'pause'
  }, {
    type: 'native'
  }]

  skill.transform(dts)

  t.strictEqual(skill.directives[0].type, 'native', 'The directive type native should always be front of tts')
})
