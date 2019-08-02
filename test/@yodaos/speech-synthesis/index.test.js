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

test('should cancel all queuing utterance', t => {
  t.plan(2)
  var api = new EventEmitter()
  api.appId = 'test'
  api.effect = {
    play: () => {},
    stop: () => {}
  }
  var speechSynthesis = new SpeechSynthesis(api)
  var utter1 = speechSynthesis.speak('foo')
  var utter2 = speechSynthesis.speak('foo')
  utter1.on('start', () => {
    speechSynthesis.cancel()
  })
  utter1.on('cancel', oncancel.bind(1))
  utter2.on('cancel', oncancel.bind(2))

  var canceled = []
  function oncancel (id) {
    canceled.push(id)
    t.pass(`utter ${id} canceled`)
    if (canceled.length === 2) {
      t.end()
    }
  }
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

test('should emit error on timeout', t => {
  t.plan(3)
  var api = new EventEmitter()
  api.appId = 'timeout'
  api.effect = {
    play: () => {},
    stop: () => {}
  }
  var speechSynthesis = new SpeechSynthesis(api)
  var utter = speechSynthesis.speak('foo')
  t.strictEqual(speechSynthesis.speaking, false, 'not speaking')

  utter.on('start', () => {
    t.strictEqual(speechSynthesis.speaking, true, 'started')
  })
  utter.on('end', () => {
    t.fail('unreachable path')
  })
  utter.on('cancel', () => {
    t.fail('unreachable path')
  })
  utter.on('error', () => {
    t.pass('error emitted')
    t.end()
  })
})

test('should emit error on arbitrary error', t => {
  t.plan(3)
  var api = new EventEmitter()
  api.appId = 'immediate-error'
  api.effect = {
    play: () => {},
    stop: () => {}
  }
  var speechSynthesis = new SpeechSynthesis(api)
  var utter = speechSynthesis.speak('foo')
  t.strictEqual(speechSynthesis.speaking, false, 'not speaking')

  utter.on('start', () => {
    t.strictEqual(speechSynthesis.speaking, true, 'started')
  })
  utter.on('end', () => {
    t.fail('unreachable path')
  })
  utter.on('cancel', () => {
    t.fail('unreachable path')
  })
  utter.on('error', () => {
    t.pass('error emitted')
    t.end()
  })
})

test('should emit uncaught exception', t => {
  t.plan(1)
  var api = new EventEmitter()
  api.appId = 'immediate-error'
  api.effect = {
    play: () => {},
    stop: () => {}
  }
  var speechSynthesis = new SpeechSynthesis(api)
  speechSynthesis.speak('foo')

  function uncaughtException (e) {
    t.throws(() => {
      throw e
    }, 'SpeechSynthesisError')
    t.end()
    process.removeListener('uncaughtException', uncaughtException)
  }
  process.on('uncaughtException', uncaughtException)
})
