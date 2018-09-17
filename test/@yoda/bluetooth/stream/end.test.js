'use strict'

var test = require('tape')
var zeromq = require('zeromq')
var bluetooth = require('@yoda/bluetooth')

test('end command receive success', (t) => {
  var socket = zeromq.socket('sub')
  var isopened = false
  socket.connect(`ipc://${process.env.BLUETOOTH_CHANNEL_PREFIX}/command`)
  socket.subscribe('')
  socket.on('message', (data) => {
    var msg = JSON.parse(data)
    t.equal(msg.proto, 'ROKID_BLE', 'should use ROKID_BLE protocol')
    if (!isopened) {
      t.equal(msg.command, 'OFF', 'the command is OFF')
      // bluetooth.disconnect()
      isopened = true
    } else {
      t.equal(msg.command, 'OFF', 'the command is OFF')
      t.end()
      socket.close()
      isopened = false
    }
  })

  var messageStream = bluetooth.getMessageStream()
  setTimeout(() => {
    messageStream.end()
    messageStream.end()
  }, 1000)
})
