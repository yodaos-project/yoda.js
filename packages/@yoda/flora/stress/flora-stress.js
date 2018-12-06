'use strict'

var uri = 'unix:/var/run/flora.sock'
var flora = require('@yoda/flora')
var sender
var recv
var sendMsg = 'flora-stress.msg.counter'
var recvCounter = 0
var MSG_COUNT = 1000

function closeAgents () {
  sender.close()
  recv.close()
}

function postMsg () {
  var i
  for (i = 0; i < MSG_COUNT; ++i) {
    sender.post(sendMsg + i, [ i, 'hello world', [ 10, 9, 8, 7, '6', '5', '4' ], 'byebye' ])
  }
}

function restartTest () {
  closeAgents()
  recvCounter = 0
  createAgents()
  postMsg()
}

function createAgents () {
  sender = new flora.Agent(uri + '#stress-send')
  recv = new flora.Agent(uri + '#stress-recv')
  sender.start()

  var i
  for (i = 0; i < MSG_COUNT; ++i) {
    recv.subscribe(sendMsg + i, (msg, type) => {
      console.log('received stress msg', msg[0])
      if (msg[0] === recvCounter) {
        ++recvCounter
        if (recvCounter === MSG_COUNT) {
          restartTest()
        }
      } else {
        console.log('failed: received msg', msg[0], 'but excepted', recvCounter)
        closeAgents()
      }
    })
  }
  recv.start()
}

createAgents()
postMsg()
