var test = require('tape')
var EventEmitter = require('events')
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis

test('should create utterance and speak', t => {
  var api = new EventEmitter()
  api.appId = 'test'
  api.effect = {
    play: () => {},
    stop: () => {}
  }
  var speechSynthesis = new SpeechSynthesis(api)
  var utter = speechSynthesis.speak('foo')
  t.strictEqual(speechSynthesis.pending, true, 'pending')
  t.strictEqual(speechSynthesis.paused, false, 'paused')
  t.strictEqual(speechSynthesis.speaking, false, 'speaking')
  utter.on('start', () => {
    t.strictEqual(speechSynthesis.pending, false, 'pending')
    t.strictEqual(speechSynthesis.paused, false, 'paused')
    t.strictEqual(speechSynthesis.speaking, true, 'speaking')
  })
  utter.on('end', () => {
    t.strictEqual(speechSynthesis.pending, false, 'pending')
    t.strictEqual(speechSynthesis.paused, false, 'paused')
    t.strictEqual(speechSynthesis.speaking, false, 'speaking')
    t.end()
  })
})

test('should cancel utterance', t => {
  var api = new EventEmitter()
  api.appId = 'test'
  api.effect = {
    play: () => {},
    stop: () => {}
  }
  var speechSynthesis = new SpeechSynthesis(api)
  var utter = speechSynthesis.speak('foo')
  t.strictEqual(speechSynthesis.speaking, false, 'not speaking')
  utter.on('start', () => {
    t.strictEqual(speechSynthesis.speaking, true, 'speaking')

    speechSynthesis.cancel()
  })

  utter.on('cancel', () => {
    t.strictEqual(speechSynthesis.speaking, false, 'canceled')
    t.end()
  })
})
