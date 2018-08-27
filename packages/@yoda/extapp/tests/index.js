var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var assert = require('assert')
var ExtAppService = require('../index').ExtAppService

var final = {
  keyEvent: false
}

function MockAdapter () {
  EventEmitter.call(this)
}
inherits(MockAdapter, EventEmitter)
MockAdapter.prototype.register = function (appId) {
  return new Promise((resolve, reject) => {
    resolve()
  })
}
MockAdapter.prototype.extAppMethod = function (name, args) {
  return new Promise((resolve, reject) => {
    if (name === 'tts') {
      resolve(['tts123'])
      console.log('test tts.say')
      assert.strictEqual(args[0], '@cloud', 'tts.say first args should be @cloud')
      assert.strictEqual(args[1], 'abcd', 'tts.say second args should be adcd')
    } else if (name === 'media') {
      resolve(['media321'])
      console.log('test audio.play')
      assert.strictEqual(args[0], '@cloud', 'audio.play first args should be @cloud')
      assert.strictEqual(args[1], 'www.baidu.com', 'audio.play second args should be www.baidu.com')
    } else if (name === 'setPickup') {
      resolve([])
      console.log('test setPickup')
      assert.strictEqual(args[0], '@cloud', 'audio.play first args should be @cloud')
      assert.strictEqual(args[1], 'true', 'setPickup second args should be true')
    } else {
      resolve([])
    }
  })
}
MockAdapter.prototype.listenAppEvent = function () {
  return new Promise((resolve, reject) => {
    resolve()
  })
}
MockAdapter.prototype.listenVuiEvent = function () {
  return new Promise((resolve, reject) => {
    resolve()
  })
}

var service = new ExtAppService(MockAdapter, {})
service.handleEvent()

service.on('restart', function () {
  final.restart = true
})
service.on('tts:complete:123456', function () {
  final.tts = true
})
service.on('audio:complete:654321', function () {
  final.audio = true
})

service.onVuiEvent('ready', [])
console.log('test vui restart')
assert.strictEqual(final.restart, true, 'service should emit restart')

service.emit('onTtsComplete', ['123456'])
console.log('test tts callback')
assert.strictEqual(final.tts, true, 'tts should complete with id: 123456')

service.emit('onMediaComplete', ['123456'])
console.log('test audio callback')
assert.strictEqual(final.tts, true, 'audio should complete with id: 654321')

var app = service.create('@cloud')

app.on('ready', function () {
  final.ready = true
})

app.on('error', function (_) {
  final.error = true
})

app.on('created', function () {
  final.created = true
})

app.on('paused', function () {
  final.paused = true
})

app.on('resumed', function () {
  final.resumed = true
})

app.on('onrequest', function (nlp, action) {
  final.onrequest = true
  final.nlp = nlp
  final.action = action
})

app.on('destroyed', function () {
  final.destroyed = true
})

app.on('keyEvent', function () {
  final.keyEvent = true
})

service.onEvent('onCreate', ['@cloud'])
service.onEvent('onPause', ['@cloud'])
service.onEvent('onResume', ['@cloud'])
service.onEvent('nlp', ['@cloud', 1, 2])
service.onEvent('onDestroy', ['@cloud'])
service.onEvent('error', ['@cloud'])
service.onEvent('ready', ['@cloud'])

console.log('test getAppId()')
assert.strictEqual(app.getAppId(), '@cloud', 'app.getAppId()')
console.log('test onready')
assert.strictEqual(final.ready, true, 'app.on->ready')
console.log('test onerror')
assert.strictEqual(final.error, true, 'app.on->error')
console.log('test oncreated')
assert.strictEqual(final.created, true, 'app.on->created')
console.log('test onpaused')
assert.strictEqual(final.paused, true, 'app.on->paused')
console.log('test onresumed')
assert.strictEqual(final.resumed, true, 'app.on->resumed')
console.log('test onrequest')
assert.strictEqual(final.onrequest, true, 'app.on->onrequest')
assert.strictEqual(final.nlp, 1, 'app.on->onrequest params:nlp')
assert.strictEqual(final.action, 2, 'app.on->onrequest params:action')
console.log('test onkeyEvent')
assert.strictEqual(final.keyEvent, false, 'app.on->keyEvent')

app.tts.say('abcd')
app.audio.play('www.baidu.com')
app.setPickup(true)

console.log('all test have done')
