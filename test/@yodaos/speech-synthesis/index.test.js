var test = require('tape')
var EventEmitter = require('events')
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis

test('should create utterance and speak', t => {
  var api = new EventEmitter()
  api.speak = (text) => {
    t.strictEqual(text, 'foo')
    var id = '1'
    setTimeout(() => {
      api.emit('start', id)
    }, 100)
    setTimeout(() => {
      api.emit('end', id)
    }, text.length * 500)
    return Promise.resolve(id)
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
