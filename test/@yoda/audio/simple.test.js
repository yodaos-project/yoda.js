'use strict'

var test = require('tape')
var AudioManager = require('@yoda/audio').AudioManager

test('tts stream types', (t) => {
  t.equal(typeof AudioManager.STREAM_AUDIO, 'number')
  t.equal(typeof AudioManager.STREAM_TTS, 'number')
  t.equal(typeof AudioManager.STREAM_PLAYBACK, 'number')
  t.equal(typeof AudioManager.STREAM_ALARM, 'number')
  t.equal(typeof AudioManager.STREAM_SYSTEM, 'number')
  t.end()
})

test('set/get tts volume', (t) => {
  t.plan(1)
  AudioManager.setVolume(AudioManager.STREAM_TTS, 100)
  t.equal(AudioManager.getVolume(AudioManager.STREAM_TTS), 100)
  t.end()
})

test('set tts volume with 0', (t) => {
  AudioManager.setVolume(AudioManager.STREAM_TTS, 0)
  t.pass()
  t.end()
})