'use strict'

var test = require('tape')
var AudioManager = require('@yoda/audio').AudioManager

function setAndGetVolum(t,input,output){
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

test.skip('set/get tts volume 101', (t) => {
  setAndGetVolum(t, 101, 101)
})

test.skip('set/get tts volume 1', (t) => {
  setAndGetVolum(t, 1, 1)
})

test.skip('set/get tts volume -1', (t) => {
  setAndGetVolum(t, -1, -1)
})

test.skip('set/get tts volume 1.6', (t) => {
  setAndGetVolum(t, 1.6, 1.6)
})

test('set/get tts volume 0', (t) => {
  setAndGetVolum(t, 0, 0)
})

