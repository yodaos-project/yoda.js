'use strict'

var uri = 'unix:/var/run/flora.sock'
var flora = require('@yoda/flora')
var msgInfos = [
  { name: 'msg0', arg: [ 'hello' ] },
  { name: 'msg1', arg: [ 1, 'world' ] },
  { name: 'msg2', arg: [ [ 'submsg' ], 1, 'world' ] },
  { name: 'msg3', arg: undefined },
  { name: 'msg4', arg: [ [ [ 'subsub' ] ], 1, 2, [ 'sub', 'msg' ] ] },
  { name: 'msg5', arg: [ 100 ] },
  { name: 'msg6', arg: [ 100, 200 ] },
  { name: 'msg7', arg: [ 100, 200, 300 ] },
  { name: 'msg8', arg: [ 100, '201', 300 ] },
  { name: 'msg9', arg: [ 100, [ '201' ], 300 ] }
]
var methodInfos = [
  { name: 'func0', arg: [ 'hello' ], retCode: 0 },
  { name: 'func1', arg: [ 1, 'world' ], retCode: 100 },
  { name: 'func2', arg: [ [ 'submsg' ], 1, 'world' ], retCode: 0 },
  { name: 'func3', arg: undefined, retCode: -1 },
  { name: 'func4', arg: [ [ [ 'subsub' ] ], 1, 2, [ 'sub', 'msg' ] ], retCode: -1000 },
  { name: 'func5', arg: [ 100 ], retCode: 0 },
  { name: 'func6', arg: [ 100, 200 ], retCode: 0 },
  { name: 'func7', arg: [ 100, 200, 300 ], retCode: 7 },
  { name: 'func8', arg: [ 100, '201', 300 ], retCode: 32768 },
  { name: 'func9', arg: [ 100, [ '201' ], 300 ], retCode: 0 }
]
var recvNames = [
  'stress-recv0',
  'stress-recv1',
  'stress-recv2',
  'stress-recv3',
  'stress-recv4',
  'stress-recv5',
  'stress-recv6',
  'stress-recv7',
  'stress-recv8'
]
var senderCount = 0

function Receiver (name) {
  this.name = name
}

Receiver.prototype.start = function () {
  var i
  var m
  this.agent = new flora.Agent(uri + '#' + this.name)
  for (i = 0; i < msgInfos.length; ++i) {
    m = msgInfos[i]
    this.agent.subscribe(m.name, this.recvMsg)
  }
  for (i = 0; i < methodInfos.length; ++i) {
    m = methodInfos[i]
    this.agent.declareMethod(m.name, (msg, reply) => {
      this.recvInvocation(msg, reply, m.retCode)
    })
  }
  this.agent.start()
  this.stopInFuture()
}

Receiver.prototype.recvMsg = function (msg, type) {
}

Receiver.prototype.recvInvocation = function (msg, reply, code) {
  reply.writeCode(code)
  reply.writeData(msg)
  reply.end()
}

Receiver.prototype.stopInFuture = function () {
  var t = Math.ceil(Math.random() * 3600) + 60
  setTimeout(() => {
    this.agent.close()
    this.startInFuture()
  }, t * 1000)
  console.log('Receiver', this.name, 'stop after', t, 'seconds')
}

Receiver.prototype.startInFuture = function () {
  var t = Math.ceil(Math.random() * 600) + 60
  setTimeout(() => {
    this.start()
  }, t * 1000)
  console.log('Receiver', this.name, 'start after', t, 'seconds')
}

function Sender (type, cb) {
  this.interval = Math.ceil(Math.random() * 10000) + 100
  if (type === 0) {
    this.send = () => {
      if (this.index >= msgInfos.length) {
        return false
      }
      var info = msgInfos[this.index]
      this.agent.post(info.name, info.arg)
      return true
    }
  } else {
    this.send = () => {
      if (this.index >= methodInfos.length) {
        return false
      }
      var info = methodInfos[this.index]
      var targetIndex = Math.ceil(Math.random() * 77669980) % recvNames.length
      this.agent.call(info.name, info.arg, recvNames[targetIndex]).then(() => {}, () => {})
      return true
    }
  }
  this.index = 0
  this.closecb = cb
}

Sender.prototype.start = function () {
  this.agent = new flora.Agent(uri)
  this.agent.start()
  this.index = 0
  this.timer = setInterval(() => {
    if (!this.send()) {
      clearInterval(this.timer)
      this.agent.close()
      this.agent = undefined
      --senderCount
      console.log('sender quit: count', senderCount)
      this.closecb()
    }
    ++this.index
  }, this.interval)
  ++senderCount
  console.log('active sender: interval', this.interval, 'count', senderCount)
}

function senderClosed (type) {
  setTimeout(() => {
    var s = new Sender(type, () => { senderClosed(type) })
    s.start()
  }, 2000)
}

var receivers = []
var maxSender = 100
function main () {
  var i
  for (i = 0; i < recvNames.length; ++i) {
    receivers[i] = new Receiver(recvNames[i])
    receivers[i].start()
  }
  for (i = 0; i < maxSender; ++i) {
    var s = new Sender(0, () => { senderClosed(0) })
    s.start()
    s = new Sender(1, () => { senderClosed(1) })
    s.start()
  }
}

main()
