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
    t.equal(msg.proto, 'A2DPSINK', 'should use A2DPSINK protocol')
    if (!isopened) {
      t.equal(msg.command, 'OFF', 'the command is OFF')
      isopened = true
    } else {
      t.equal(msg.command, 'OFF', 'the command is OFF')
      t.end()
      socket.close()
      isopened = false
    }
  })

  var player = bluetooth.getPlayer()
  setTimeout(() => {
    player.end()
    player.end()
  }, 1000)
})
