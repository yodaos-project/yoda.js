var mm = require('@yodaos/mm')
var mock = require('@yodaos/mm/mock')

var test = mm.test
test = mm.beforeEach(test, t => {
  t.suite = mm.bootstrap()
  t.end()
})
test = mm.afterEach(test, t => {
  t.suite.teardown()
  t.end()
})

function focusOnce (t, event, expectedFocus) {
  return new Promise(resolve => {
    t.suite.audioFocus
      .once(event, focus => {
        if (expectedFocus == null) {
          resolve(focus)
        }
        if (focus === expectedFocus) {
          resolve(focus)
        }
      })
  })
}

function speechSynthesisOnce (t, event, expectedUtterance) {
  return new Promise(resolve => {
    t.suite.speechSynthesis
      .once(event, utter => {
        if (expectedUtterance == null) {
          resolve(utter)
        }
        if (utter === expectedUtterance) {
          resolve(utter)
        }
        resolve(utter)
      })
  })
}

test('should resume on gain if no text given', t => {
  t.plan(2)

  var application = t.suite.getApplication()
  var voice = application.startVoice('player', [ null, '/opt/media/awake_01.wav' ])

  mock.proxyMethod(voice.player, 'start', {
    before: () => {
      t.pass('player started')
    }
  })
  focusOnce(t, 'gained')
    .then(() => {
      t.strictEqual(voice.resumeOnGain, false)
      t.end()
    })
})

test('should resume on speech-synthesis end if text given and ran sequentially', t => {
  t.plan(1)

  var application = t.suite.getApplication()
  var voice = application.startVoice('player', [ 'foo', '/opt/media/awake_01.wav', /** transient */true, /** sequential */true ])

  mock.proxyMethod(voice.player, 'start', {
    before: () => {
      t.fail('unreachable path')
    }
  })
  focusOnce(t, 'gained')
    .then(() => {
      mock.restore()
      mock.proxyMethod(voice.player, 'start', {
        before: () => {
          t.pass('player started')
        }
      })
      return speechSynthesisOnce(t, 'end')
    })
    .then(() => {
      t.end()
    })
})

test('should not resume if paused before transient focus loss', t => {
  t.plan(3)

  var application = t.suite.getApplication()
  var voice = application.startVoice('player', [ null, '/opt/media/awake_01.wav' ])
  focusOnce(t, 'gained')
    .then(() => {
      voice.pause()
      t.pass('player paused')

      mock.mockReturns(voice.player, 'start', () => {
        t.fail('unreachable path')
      })
      var cut = application.startVoice('player', [ 'foo', null, /** transient */true ])
      return focusOnce(t, 'gained', cut)
    })
    .then(() => {
      mock.restore()
      mock.proxyMethod(voice.player, 'start', {
        before: () => {
          t.pass('player started')
        }
      })
      voice.resume()
      return focusOnce(t, 'gained', voice)
    })
    .then(() => {
      t.strictEqual(voice.resumeOnGain, false)
      t.end()
    })
})
