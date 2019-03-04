'use strict'

var test = require('tape')
var mock = require('@yoda/mock')

test('Timer: test stop timer while timer is not started.', t => {
  mock.mockAppRuntime('/opt/apps/timer')
    .then(runtime => {
      runtime.restore()
      runtime.mockService('tts', 'speak', function (appid, text) {
        console.log(text)
        t.equal(appid, '@yoda/timer')
        t.equal(text, '计时器未打开')
        t.end()
        return Promise.resolve([this.ttsId++])
      })
      runtime.handleNlpIntent('', {intent: 'timer_close', appId: 'RFCBA81EECAC4E11BA0EBC1AEC397A93'})
    })
})
