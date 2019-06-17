var test = require('tape')
var EventEmitter = require('events')
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis

test('should create utterance and speak', t => {
  t.plan(13)
  var api = new EventEmitter()
  api.appId = 'test'
  api.effect = {
    play: (name, args, options) => {
      t.strictEqual(name, 'system://setSpeaking.js')
      t.strictEqual(args, undefined)
      t.deepEqual(options, { shouldResume: true })
    },
    stop: (name) => {
      t.strictEqual(name, 'system://setSpeaking.js')
    }
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
  t.plan(3)
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

test('should cancel immediately', t => {
  t.plan(3)
  var api = new EventEmitter()
  api.appId = 'test'
  api.effect = {
    play: () => {},
    stop: () => {}
  }
  var speechSynthesis = new SpeechSynthesis(api)
  var utter = speechSynthesis.speak('foo')
  t.strictEqual(speechSynthesis.speaking, false, 'not speaking')
  speechSynthesis.cancel()

  utter.on('start', () => {
    t.strictEqual(speechSynthesis.speaking, true, 'started')
  })
  utter.on('cancel', () => {
    t.strictEqual(speechSynthesis.speaking, false, 'canceled')
    t.end()
  })
})
