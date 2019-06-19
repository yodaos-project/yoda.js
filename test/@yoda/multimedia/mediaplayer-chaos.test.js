'use strict'

var test = require('tape')
var path = require('path')
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var helper = require('../../helper')

var events = [
  'prepared',
  'playbackcomplete',
  'bufferingupdate',
  'seekcomplete',
  'playing',
  'blockpausemode',
  'error'
]

var dataSource = path.join(helper.paths.fixture, 'audio', 'awake_01.wav')

test('duplicate start/stop', (t) => {
  t.plan(1)
  var player = new MediaPlayer()
  var actual = []
  var expected = ['prepared', 'playing', 'playbackcomplete']
  events.forEach(it => player.on(it, () => actual.push(it)))
  player.on('playbackcomplete', () => {
    t.deepEqual(actual, expected)

    for (var si = 0; si < 10; si++) {
      player.stop()
      setTimeout(() => player.stop(), si * 10)
    }
  })
  player.setDataSource(dataSource)
  player.prepare()
  for (var si = 0; si < 10; si++) {
    player.start()
    setTimeout(() => {
      player.start()
    }, si * 10)
  }
})
