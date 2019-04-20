'use strict'

var test = require('tape')
var URL = require('url')
var helper = require('../../helper')
var Skill = require(`${helper.paths.apps}/cloudappclient/skill`)

function createSkill (form, shouldEndSession, directives) {
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
        directives: directives || []
      }
    }
  })
}

test('test saveRecoverData', (t) => {
  t.plan(1)
  var directives = [{
    type: 'media',
    action: 'PLAY',
    item: {
      url: 'http://www.kugou.com/hello.mp3?refer=yodaos&agent=cloudappclient'
    }
  }]

  var skill = createSkill('scene', false, directives)

  var activity = {
    openUrl: function (url) {
      var urlObj = URL.parse(url, true)
      var urlMiddle = urlObj.query.url
      var finalUrl = URL.parse(urlMiddle, true)
      var data = finalUrl.query.data
      var directive = JSON.parse(data)
      t.strictEqual(directives[0].item.url, directive.item.url)
    }
  }
  skill.saveRecoverData(activity)
})
