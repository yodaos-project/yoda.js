'use strict'

var test = require('tape')
var helper = require('../../helper')
var CustomConfig = require(`${helper.paths.runtime}/lib/component/custom-config`)

test('custom-config check', function (t) {
  var runtime = {}
  var liftTimeCb
  runtime.setPickup = function () {
  }
  runtime.component = {
    lifetime: {
      on: function (event, cb) {
        t.strictEqual(event, 'eviction')
        liftTimeCb = cb
      }
    },
    dndMode: {
      setOption: function (option) {
        t.strictEqual(option.startTime, '23:00')
      }
    }
  }
  var firstConfig = {
    standbyLight: '{"action":"open"}',
    continuousDialog: '{"action":"close"}'
  }
  var config = {
    nightMode: {
      startTime: '23:00',
      endTime: '18:00',
      action: 'close'
    },
    standbyLight: {
      action: 'close'
    }
  }
  var customConfig = new CustomConfig(runtime)
  runtime.openUrl = function (url, option) {
    t.strictEqual(url, 'yoda-skill://custom-config/firstLoad?config={"standbyLight":"{\\"action\\":\\"open\\"}","continuousDialog":"{\\"action\\":\\"close\\"}"}')
  }
  customConfig.onLoadCustomConfig(JSON.stringify(firstConfig))
  runtime.openUrl = function (url, option) {
    t.strictEqual(url, 'yoda-skill://custom-config/reload')
  }
  customConfig.runtimeDidResumeFromSleep()
  runtime.openUrl = function (url, option) {
    t.strictEqual(url, 'yoda-skill://custom-config/standbyLight?action=close')
  }
  liftTimeCb('123', 'cut')
  liftTimeCb('123', 'scene')
  customConfig.onCustomConfig(JSON.stringify(config))
  t.end()
})
