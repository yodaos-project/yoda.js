'use strict'

var test = require('tape')
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var AudioManager = require('@yoda/audio').AudioManager
var logger = require('logger')('simple.test')

test('should play a wakeup music', t => {
  t.plan(3)
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  logger.log("test sss***")
  
  player.on('prepared', () => {
    logger.log("test pass***")
    t.pass()
  })
  player.on('playbackcomplete', () => {
    logger.log("test sssss***")
    player.stop()
    t.pass()
    t.end()
  })
  t.player.playing
  player.start('/opt/media/wakeup.ogg')
})
