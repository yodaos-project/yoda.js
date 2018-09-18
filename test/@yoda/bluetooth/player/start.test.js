'use strict'

var test = require('tape')
var zeromq = require('zeromq')
var bluetooth = require('@yoda/bluetooth')

test('start command receive success', (t) => {
  var btName = 'foobar'
  var btName1 = 'foobar1'
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
      // bluetooth.disconnect()
      isopened = true
    } else {
      t.equal(msg.command, 'ON', 'the command is ON')
      t.equal(msg.name, btName1, `the btName is ${btName1}`)
      t.end()
      socket.close()
      isopened = false
    }
  })

  var player = bluetooth.getPlayer()
  setTimeout(() => {
    // after socket connect successfully,try send cmd message 'ON'
    player.start(btName)
    // after socket connect successfully,double try send cmd message 'ON'
    player.start(btName1)
  }, 1000)
})
