'use strict'

var test = require('tape')
var AudioManager = require('@yoda/audio').AudioManager

function setAndGetVolum (t, input, output) {
  t.plan(1)
  AudioManager.setVolume(AudioManager.STREAM_TTS, input)
  t.equal(AudioManager.getVolume(AudioManager.STREAM_TTS), output)
  t.end()
}

test('tts stream types', (t) => {
  t.equal(typeof AudioManager.STREAM_AUDIO, 'number')
  t.equal(typeof AudioManager.STREAM_TTS, 'number')
  t.equal(typeof AudioManager.STREAM_PLAYBACK, 'number')
  t.equal(typeof AudioManager.STREAM_ALARM, 'number')
  t.equal(typeof AudioManager.STREAM_SYSTEM, 'number')
  t.end()
})

test('set/get tts volume 100', (t) => {
  setAndGetVolum(t, 100, 100)
})

test('set/get tts volume 101', (t) => {
  setAndGetVolum(t, 101, 100)
})

test('set/get tts volume 1', (t) => {
  setAndGetVolum(t, 1, 1)
})

test('cannot set system volume', (t) => {
  t.throws(() => {
    AudioManager.setVolume(AudioManager.STREAM_SYSTEM, 1)
  }, Error)
  t.end()
})

test('set/get tts volume undefined', (t) => {
  t.throws(() => {
    AudioManager.setVolume(undefined, 1)
  }, new RegExp('undefined'))
  t.end()
})

test('set/get tts volume -1', (t) => {
  setAndGetVolum(t, -1, 0)
})

test('set/get tts volume 1.6', (t) => {
  setAndGetVolum(t, 1.6, 1)
})

test('set/get tts volume 0', (t) => {
  setAndGetVolum(t, 0, 0)
})

test('set/get tts volume string', (t) => {
  t.plan(1)
  t.throws(() => {
    AudioManager.setVolume(AudioManager.STREAM_TTS, 'a')
  }, /TypeError: vol must be a number/)
  t.end()
})

test('set/cancel tts volume mute', (t) => {
  t.plan(5)
  AudioManager.setVolume(AudioManager.STREAM_TTS, 50)
  AudioManager.setMute(true)
  t.equal(AudioManager.getVolume(AudioManager.STREAM_TTS), 50)
  AudioManager.setVolume(AudioManager.STREAM_TTS, 60)
  t.equal(AudioManager.isMuted(), true)
  t.equal(AudioManager.getVolume(AudioManager.STREAM_TTS), 60)
  AudioManager.setMute(false)
  t.equal(AudioManager.isMuted(), false)
  t.equal(AudioManager.getVolume(AudioManager.STREAM_TTS), 60)
  t.end()
})

// Bug Id 1297, 1298
test('set/get volume with different stream model in 0-100', (t) => {
  var strs = ['STREAM_AUDIO', 'STREAM_TTS', 'STREAM_PLAYBACK', 'STREAM_ALARM', '']
  strs.forEach((str) => {
    for (var i = 1; i <= 100; i++) {
      if (str !== '') {
        AudioManager.setVolume(AudioManager[str], i)
        if (AudioManager.getVolume(AudioManager[str]) !== i) {
          t.fail(`it should be set volume to ${i}`)
        }
      } else {
        AudioManager.setVolume(i)
        if (AudioManager.getVolume() !== i) {
          t.fail(`it should be set volume to ${i}`)
        }
      }
    }
  })
  t.end()
})

test('set/cancel tts volume mute', (t) => {
  t.plan(5)
  AudioManager.setVolume(AudioManager.STREAM_TTS, 50)
  AudioManager.setMute(true)
  t.equal(AudioManager.getVolume(AudioManager.STREAM_TTS), 50)
  AudioManager.setVolume(AudioManager.STREAM_TTS, 60)
  t.equal(AudioManager.isMuted(), true)
  t.equal(AudioManager.getVolume(AudioManager.STREAM_TTS), 60)
  AudioManager.setMute(false)
  t.equal(AudioManager.isMuted(), false)
  t.equal(AudioManager.getVolume(AudioManager.STREAM_TTS), 60)
  t.end()
})

test('set audio to linear shape', (t) => {
  t.plan(1)
  t.equal(AudioManager.setVolumeShaper(AudioManager.LINEAR_RAMP), true)
  t.end()
})
