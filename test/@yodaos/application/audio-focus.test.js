var test = require('tape')
var EventEmitter = require('events')

var AudioFocus = require('@yodaos/application').AudioFocus

test('should create audio focus', t => {
  t.plan(3)

  var api = new EventEmitter()
  api.request = function (opt) {
    api.emit('gain', opt.id)
    return Promise.resolve()
  }
  api.abandon = function (id) {
    api.emit('loss', id, false, false)
    return Promise.resolve()
  }

  var focus = new AudioFocus(AudioFocus.Type.TRANSIENT, api)
  focus.onGain = () => {
    t.strictEqual(focus.state, AudioFocus.State.ACTIVE)
    focus.abandon()
  }
  focus.onLoss = (transient, mayDuck) => {
    t.strictEqual(transient || mayDuck, false)
    t.strictEqual(focus.state, AudioFocus.State.INACTIVE)
  }
  focus.request()
})

test('should create audio focus of expected type', t => {
  t.plan(4)

  var api = new EventEmitter()
  api.request = function (opt) {
    t.strictEqual(opt.gain, /** TRANSIENT_EXCLUSIVE */0b011)
    api.emit('gain', opt.id)
    return Promise.resolve()
  }
  api.abandon = function (id) {
    api.emit('loss', id, false, false)
    return Promise.resolve()
  }

  var focus = new AudioFocus(AudioFocus.Type.TRANSIENT_EXCLUSIVE, api)
  focus.onGain = () => {
    t.strictEqual(focus.state, AudioFocus.State.ACTIVE)
    focus.abandon()
  }
  focus.onLoss = (transient, mayDuck) => {
    t.strictEqual(transient || mayDuck, false)
    t.strictEqual(focus.state, AudioFocus.State.INACTIVE)
  }
  focus.request()
})

test('should re-register audio focus on recycling', t => {
  t.plan(6)

  var api = new EventEmitter()
  api.request = function (opt) {
    api.emit('gain', opt.id)
    return Promise.resolve()
  }
  api.abandon = function (id) {
    api.emit('loss', id, false, false)
    return Promise.resolve()
  }

  var focus = new AudioFocus(AudioFocus.Type.TRANSIENT, api)
  focus.onGain = () => {
    t.strictEqual(focus.state, AudioFocus.State.ACTIVE)
    focus.abandon()
  }
  var lost = false
  focus.onLoss = (transient, mayDuck) => {
    t.strictEqual(transient || mayDuck, false)
    t.strictEqual(focus.state, AudioFocus.State.INACTIVE)
    if (!lost) {
      lost = true
      focus.request()
    }
  }
  focus.request()
})
