'use strict'

var test = require('tape')

var property = require('@yoda/property')
var mocker = require('./battery.helper')

test('intent: battery_usetime', (t) => {
  mocker.setBatteryInfo({
    batChargingOnline: false,
    batTimetoEmpty: 135,
    batLevel: 20
  })
  var activity = mocker.createActivity()
  activity.assertIntent('battery_usetime', {
    tts: {
      speak: (text) => {
        t.equal(text, '当前电量百分之20，可以使用2小时15分钟。')
        return Promise.resolve()
      }
    },
    exit: () => {
      t.end()
    }
  })
})

test('url: power_off', (t) => {
  mocker.setBatteryInfo({
    batLevel: 20,
    batTimetoEmpty: 61
  })
  var activity = mocker.createActivity()
  activity.assertURL({
    pathname: '/power_off',
    query: { is_play: 'false' }
  }, {
    playSound: (sound) => {
      t.equal(sound, 'system://power_pull.ogg')
      return Promise.resolve()
    },
    tts: {
      speak: (text) => {
        t.equal(text, '电量百分之20，还能使用1小时1分钟。')
        return Promise.resolve()
      }
    },
    exit: () => {
      t.end()
    }
  })
})

test('url: temperature_55', (t) => {
  var activity = mocker.createActivity()
  activity.assertURL({
    pathname: '/temperature_55'
  }, {
    media: {
      start: (url, opts) => {
        t.equal(url, './res/battery_temp_high.ogg')
        t.equal(opts.impatient, false)
        return Promise.resolve()
      }
    },
    exit: () => {
      t.end()
    }
  })
})