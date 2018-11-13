'use strict'

var test = require('tape')
var logger = require('logger')('blutooth')
var floraFactory = require('@yoda/flora')
var okUri = 'unix:/var/run/flora.sock'
var bluetooth = require('@yoda/bluetooth')
var flag = 1

test('start command receive success', (t) => {
  var recvClient = floraFactory.connect(okUri, 0)
  var msgName = 'bluetooth.ble.event'
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
  recvClient.on('recv_post', (name, type, msg) => {
    logger.info('===on===' + JSON.stringify(msg) + '==flag==' + flag)
    switch (flag) {
      case 1:listenOn(msg, 'opened')
        break
      case 2:listenOn(msg, 'closed')
        break
      case 3:listenOn(msg, 'closed')
        break
    }
  })

  function listenOn (msg, cmd) {
    logger.info('===listenon===' + JSON.stringify(msg) + '==cmd==' + cmd + '===flag====' + flag)
    t.equal(JSON.parse(msg.get(0)).state, cmd, 'command is equal')
    if (flag === 3) {
      recvClient.close()
      t.end()
    } else {
      flag++
    }
  }

  var stream = bluetooth.getMessageStream()
  setTimeout(() => {
    stream.start(msgName)
    setTimeout(() => {
      stream.write({a: 1})
      setTimeout(() => {
        stream.end()
        setTimeout(() => {
          stream.disconnect()
        }, 1000)
      }, 1000)
    }, 1000)
  }, 1000)
})
