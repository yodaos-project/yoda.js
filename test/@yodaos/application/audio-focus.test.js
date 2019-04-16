var test = require('tape')
var EventEmitter = require('events')

var AudioFocus = require('@yodaos/application').AudioFocus

test('should create audio focus', t => {
  t.plan(2)

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
    t.pass('focus gained')
    focus.abandon()
  }
  focus.onLoss = (transient, mayDuck) => {
    t.strictEqual(transient || mayDuck, false)
  }
  focus.request()
})
