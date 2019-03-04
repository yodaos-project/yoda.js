'use strict'

var test = require('tape')
var mock = require('@yoda/mock')

function testWrap (title, intent, slots) {
  test(title, t => {
    mock.mockAppRuntime('/opt/apps/guidance')
      .then(runtime => {
        runtime.restore()
        runtime.mockService('tts', 'speak', function (appid, text) {
          console.log(text)
          t.equal(appid, '@yoda/guidance')
          t.notEqual(text, undefined)
          return Promise.resolve([this.ttsId++])
        })
        runtime.handleNlpIntent('', {intent: intent, slots: slots, appId: '3C5AF934560C46CA968AA7AD067C8B9A'})
      })
    t.end()
  })
}

testWrap('Guidance: test what_can_u_do.', 'what_can_u_do')
testWrap('Guidance: test how_to_disconnect_net.', 'how_to_disconnect_net')
testWrap('Guidance: test how_to_update.', 'how_to_update')
testWrap('Guidance: test what_is_special.', 'what_is_special')
testWrap('Guidance: test rokid_service wechat.', 'rokid_service', {'wechat': 'mock'})
testWrap('Guidance: test rokid_service rokidwebsite.', 'rokid_service', {'rokidwebsite': 'mock'})
testWrap('Guidance: test rokid_service phonenum.', 'rokid_service', {'phonenum': 'mock'})
testWrap('Guidance: test rokid_light.', 'rokid_light')
testWrap('Guidance: test rokid_power.', 'rokid_power')
testWrap('Guidance: test unexpected.', 'unexpected')
