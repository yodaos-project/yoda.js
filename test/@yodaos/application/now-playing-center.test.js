var test = require('tape')
var EventEmitter = require('events')

var NowPlayingCenter = require('@yodaos/application').NowPlayingCenter

test('should set playing info', t => {
  t.plan(5)

  var api = new EventEmitter()
  api.setNowPlayingInfo = function (info) {
    t.deepEqual(info, { title: 'foo' })
    return Promise.resolve()
  }

  var center = new NowPlayingCenter(api)
  t.strictEqual(api.listeners('command').length, 0)
  center.setNowPlayingInfo({ title: 'foo' })
  t.strictEqual(api.listeners('command').length, 1)

  api.setNowPlayingInfo = function (info) {
    t.ok(info === null)
    return Promise.resolve()
  }
  center.setNowPlayingInfo(null)
  t.strictEqual(api.listeners('command').length, 0)
  t.end()
})

test('should proxy event "command"', t => {
  t.plan(1)
  var api = new EventEmitter()
  api.setNowPlayingInfo = function (info) {
    return Promise.resolve()
  }

  var center = new NowPlayingCenter(api)
  center.setNowPlayingInfo({ title: 'foo' })
  center.on('command', command => {
    t.deepEqual(command, { type: 'togglePausePlay' })
  })
  api.emit('command', { type: 'togglePausePlay' })
  t.end()
})
