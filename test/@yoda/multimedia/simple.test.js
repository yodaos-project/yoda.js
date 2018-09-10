'use strict'

var test = require('tape')
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var AudioManager = require('@yoda/audio').AudioManager
// var logger = require('logger')('simple.test')

test('should play a wakeup music', (t) => {
  t.plan(3)
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  var first
  player.on('prepared', () => {
    first = 'prepared'
    t.pass()
  })
  player.on('playbackcomplete', () => {
    if (first === 'prepared') {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
    player.disconnect()
  })
  player.start('/opt/media/wakeup.ogg')
})

// Bug Id 1315
test('start pause resume the media', t => {
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  var first
  player.on('prepared', () => {
    first = 'prepared'
    t.equal(player.playing, true, 'start play')
    player.pause()
    t.equal(player.playing, false, 'pause play')
    player.resume()
    t.equal(player.playing, true, 'resume play')
  })
  player.on('playbackcomplete', () => {
    if (first === 'prepared') {
      t.pass()
    } else {
      t.fail()
    }
    t.end()
    player.disconnect()
  })
  player.start('/opt/media/wakeup.ogg')
})

// Bug Id 1315
test('start pause resume stop the media', t => {
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    t.equal(player.playing, true, 'start play')
    player.pause()
    t.equal(player.playing, false, 'pause play')
    player.resume()
    t.equal(player.playing, true, 'resume play')
    player.stop()
    t.equal(player.playing, false, 'stop play')
    t.end()
    player.disconnect()
  })
  player.start('/opt/media/wakeup.ogg')
})

test('start pause reset play', t => {
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    player.pause()
    t.equal(player.playing, false, 'pause play')
    player.reset()
    t.equal(player.playing, false, 'reset play')
    t.end()
    player.disconnect()
  })
  player.start('/opt/media/wakeup.ogg')
})

// Bug Id 1318 1319
test('seek media to some point', t => {
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    var duration = player.duration
    var times = [10, 33, 55, 88, 100]
    console.log(duration)

    seekStep(0)
    function seekStep(idx) {
      console.log(idx)
      if (idx >= times.length) {
        player.stop()
        t.end()
        player.disconnect()
        return
      }
      var time = times[idx]
      player.seek(time, function () {
        t.equal(player.position, time)
        seekStep(idx + 1)
      })
    }
  })
  player.start('/opt/media/wakeup.ogg')
})

test('start pause reset play', t => {
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    player.loopMode = true
    t.equal(player.loopMode, true, 'loop mode')
    console.log('ererer')
    t.end()
    player.disconnect()
    console.log('disconnect')
  })
  player.start('/opt/media/wakeup.ogg')
})

test('start two play and get id', t => {
  var player = new MediaPlayer()
  var palyer2 = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  t.equal(palyer2._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    t.equal(typeof player.id, 'number')
    player.disconnect()
  })
  palyer2.on('prepared', () => {
    t.equal(typeof palyer2.id, 'number')
    t.notEqual(player.id, palyer2.id)
    palyer2.disconnect()
    t.end()
  })
  player.start('/opt/media/wakeup.ogg')
  palyer2.start('/opt/media/wakeup.ogg')
})

test('start two play and get id', t => {
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    t.equal(typeof player.id, 'number')
    t.end()
    player.disconnect()
  })
  player.start('/opt/media/wakeup.ogg')
})

// Bug Id 1342
test.skip('set/get volume in 0-100', (t) => {
  var nums = [0, 10, 50, 88, 100]
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    nums.forEach((str) => {
      player.setVolume(str)
      t.equal(player.volume, str)
    })
    t.end()
    player.disconnect()
  })
  player.start('/opt/media/wakeup.ogg')
})

// Bug Id 1341
test.skip('set/get volume -1', (t) => {
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    player.setVolume(-1)
    t.end()
    player.disconnect()
  })
  player.start('/opt/media/wakeup.ogg')
})

// Bug Id 1341
test.skip('set/get volume 101', (t) => {
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    player.setVolume(101)
    t.end()
    player.disconnect()
  })
  player.start('/opt/media/wakeup.ogg')
})

test('start different audio type', (t) => {
  var audios = ['batterylow.mp3', 'hibernate.wav', 'batteryconnect.ogg', 'test.aac', 'test.opus']
  audios.forEach((audio) => {
    var player = new MediaPlayer()
    t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
    player.on('prepared', () => {
      t.equal(player.playing, true, 'start play' + audio)
      player.disconnect()
    })
    player.start('/data/workspace/test/fixture/audio/' + audio)
  })
  t.end()
})

test.skip('set/get volume 101', (t) => {
  var player = new MediaPlayer()
  t.equal(player._stream, AudioManager.STREAM_PLAYBACK)
  player.on('prepared', () => {
    t.equal(player.playing, true, 'network playing')
    t.end()
    player.disconnect()
  })
  player.start('http://www.9ku.com/play/186947.htm')
})
