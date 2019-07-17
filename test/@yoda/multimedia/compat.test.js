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
  'position',
  'pause',
  'playing',
  'blockpausemode',
  'playingstatus',
  'error'
]

var dataSource = path.join(helper.paths.fixture, 'audio', 'hibernate.wav')

test('should setup media with MediaPlayer#start(url)', (t) => {
  t.plan(3)
  var player = new MediaPlayer()
  var actual = []
  var expected = ['prepared', 'playing', 'playbackcomplete']
  events.forEach(it => player.on(it, () => actual.push(it)))
  player.on('prepared', () => {
    t.strictEqual(player.playing, false)
  })
  player.on('playing', () => {
    t.strictEqual(player.playing, true)
  })
  player.on('playbackcomplete', () => {
    t.deepEqual(actual, expected)
    player.stop()
  })
  player.start(dataSource)
})

test('should setup media with MediaPlayer#prepare(url)', (t) => {
  t.plan(3)
  var player = new MediaPlayer()
  var actual = []
  var expected = ['prepared', 'playing', 'playbackcomplete']
  events.forEach(it => player.on(it, () => actual.push(it)))
  player.on('prepared', () => {
    t.strictEqual(player.playing, false)
  })
  player.on('playing', () => {
    t.strictEqual(player.playing, true)
  })
  player.on('playbackcomplete', () => {
    t.deepEqual(actual, expected)
    player.stop()
  })
  player.prepare(dataSource)
  player.start()
})

test('should not thrown on getters if player not set up', (t) => {
  t.plan(3)
  var player = new MediaPlayer()
  t.strictEqual(player.playing, false)
  t.strictEqual(player.duration, -1)
  t.strictEqual(player.position, -1)
})
