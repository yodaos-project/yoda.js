var test = require('tape')
var EventEmitter = require('events')
var helper = require('../../helper')
var AlarmCore = require(`${helper.paths.apps}/alarm/alarm-core.js`)

function bootstrap () {
  var mockApi = {
    tts: new EventEmitter(),
    media: new EventEmitter()
  }
  return mockApi
}

test('weekdayAlarm', (t) => {
  var api = bootstrap()
  var alarmCore = new AlarmCore(api)
  var date = new Date()
  var time = '10:1:30'
  var repeatType = 'WEEKDAY'
  var alarmPattern = alarmCore._transferPattern(date, time, repeatType)
  var correct = '30' + ' ' + '1' + ' ' + '10' + ' * * 1-5'
  t.equal(alarmPattern, correct)
  t.end()
})

test('weekendAlarm', (t) => {
  var api = bootstrap()
  var alarmCore = new AlarmCore(api)
  var date = new Date()
  var time = '10:1:30'
  var repeatType = 'WEEKEND'
  var alarmPattern = alarmCore._transferPattern(date, time, repeatType)
  var correct = '30' + ' ' + '1' + ' ' + '10' + ' * * 6,0'
  t.equal(alarmPattern, correct)
  t.end()
})
