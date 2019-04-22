var EventEmitter = require('events')
var TtsWrap = require('@yoda/tts')
var property = require('@yoda/property')
var _ = require('@yoda/util')._
var mock = require('../../helper/mock')

var currHandle

function MockTtsRequest (handle, id, text) {
  this.handle = handle
  this.id = id
  this.playing = false
  process.nextTick(() => {
    this.playing = true
    this.handle.emit('start', this.id)
  })

  setTimeout(() => {
    this.__end()
  }, text.length * 500)
}
MockTtsRequest.prototype.stop = function stop () {
  if (!this.playing) {
    return
  }
  this.playing = false
  process.nextTick(() => {
    this.handle.emit('cancel', this.id)
  })
}
MockTtsRequest.prototype.__end = function __end () {
  if (!this.playing) {
    return
  }
  this.playing = false
  currHandle = null
  process.nextTick(() => {
    this.handle.emit('end', this.id)
  })
}
MockTtsRequest.prototype.__error = function __error (errno) {
  if (!this.playing) {
    return
  }
  this.playing = false
  currHandle = null
  process.nextTick(() => {
    this.handle.emit('error', this.id, errno)
  })
}

mock.mockReturns(TtsWrap, 'createTts', function () {
  var handler = new EventEmitter()
  var reqId = 0

  handler.speak = function speak (text) {
    if (currHandle) {
      currHandle.stop()
    }
    currHandle = new MockTtsRequest(this, reqId, text)
    ++reqId
    return currHandle
  }
  handler.disconnect = function disconnect () {}
  handler.reconnect = function reconnect () {}
  return handler
})

mock.proxyFunction(property, 'get', {
  after: function (ret, self, args) {
    if (_.get(args, '0', 'state.network.connected')) {
      return 'true'
    }
    return ret
  }
})

module.exports = {
  lightd: { invoke: () => {} },
  getCurrentHandle: () => currHandle
}
