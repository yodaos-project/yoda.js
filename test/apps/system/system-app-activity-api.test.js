'use strict'

var test = require('tape')
var mock = require('@yoda/mock')
var logger = require('logger')('system-app-activity-api')
var wifi = require('@yoda/wifi')

test('system should be ok if intent is unexpected', t => {
  mock.mockAppRuntime('/opt/apps/system')
    .then(runtime => {
      runtime.restore()
      runtime.mockService('tts', 'speak', function (appid, text) {
        console.log(text)
        t.equal(appid, '@yoda/system')
        t.equal(text, '没有听懂你说的话，语速慢点再说一遍吧')
        t.end()
        return Promise.resolve([this.ttsId++])
      })
      runtime.handleNlpIntent('', {intent: 'unexpected', appId: '1B54DBC9F7D74C619282CCE8FE28EB7E'})
    })
})

test('system should be ok if intent is unexpected', t => {
  mock.mockAppRuntime('/opt/apps/system')
    .then(runtime => {
      runtime.handleNlpIntent('', {intent: 'disconnect_network', appId: '1B54DBC9F7D74C619282CCE8FE28EB7E'})
    })
  setTimeout(() => {
    var wifiState2 = wifi.getWifiState()
    logger.info('========wifiState2' + wifiState2 + '=========')
    t.equal(wifiState2, 2)
    t.end()
  }, 10000)
})

test('system should be ok if intent is unexpected', t => {
  mock.mockAppRuntime('/opt/apps/system')
    .then(runtime => {
      runtime.handleNlpIntent('', {intent: 'sleep', appId: '1B54DBC9F7D74C619282CCE8FE28EB7E'})
    })
  t.end()
})
