'use strict'

var test = require('tape')
var zeromq = require('zeromq')
var bluetooth = require('@yoda/bluetooth')


test('pause command receive success', (t) => {
  var btName = 'foobar'
  var socket = zeromq.socket('sub')
  var isopened = false
  socket.connect(`ipc://${process.env.BLUETOOTH_CHANNEL_PREFIX}/command`)
  socket.subscribe('')
  socket.on('message', (data) => {
    var msg = JSON.parse(data)
    t.equal(msg.proto, 'A2DPSINK', 'should use A2DPSINK protocol')
    if (!isopened) {
      t.equal(msg.command, 'ON', 'the command is ON')
      t.equal(msg.name, btName, `the btName is ${btName}`)
      isopened = true
    } else {
      t.equal(msg.command, 'PAUSE', 'the command is PLAY')
      t.end()
      socket.close()
      isopened = false
    }
  })

  var player = bluetooth.getPlayer()
  setTimeout(() => {
    player.start(btName)
    setTimeout(() => {
      player.pause()
    }, 1000)
  }, 1000)
})
