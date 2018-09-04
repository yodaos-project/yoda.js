'use strict'

var test = require('tape')
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var AudioManager = require('@yoda/audio').AudioManager
var logger = require('logger')('simple.test')

test('should play a wakeup music', t => {
  t.plan(3)
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    t.pass()
  })
  player.on('playbackcomplete', () => {
    t.pass()
    t.end()
    player.disconnect()
  })
  player.start('/opt/media/wakeup.ogg')
})
