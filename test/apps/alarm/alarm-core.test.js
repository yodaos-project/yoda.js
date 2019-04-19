var test = require('tape')
var EventEmitter = require('events')
var helper = require('../../helper')
var mm = require('../../helper/mock')
var AlarmCore = require(`${helper.paths.apps}/alarm/alarm-core.js`)
var DEFAULT_REMINDER_RING = 'system://reminder_default.mp3'

function bootstrap () {
  var mockApi = {
    tts: new EventEmitter(),
    media: new EventEmitter()
  }
  mm.mockPromise(mockApi.media, 'start', null, null)
  mm.mockPromise(mockApi.media, 'stop', null, null)
  return mockApi
}

test('playFirstMediaLocal', (t) => {
  var api = bootstrap()
  var alarmCore = new AlarmCore(api)
  alarmCore._taskCallback = (opts, isLocal) => {
    t.equal(isLocal, true)
    t.end()
  }
  alarmCore.activeOption = { type: 'Remind' }
  alarmCore.playFirstMedia(true)
  alarmCore.playMediaPrepared()
})

test('playFirstMediaOnline', (t) => {
  var api = bootstrap()
  var alarmCore = new AlarmCore(api)
  alarmCore.ringUrl = DEFAULT_REMINDER_RING
  alarmCore._taskCallback = (opts, isLocal) => {
    t.equal(isLocal, false)
    t.end()
  }
  alarmCore.activeOption = { type: 'Remind' }
  alarmCore.playFirstMedia(false)
  alarmCore.playMediaPrepared()
})

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
