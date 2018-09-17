'use strict'

var test = require('tape')
var zeromq = require('zeromq')
var bluetooth = require('@yoda/bluetooth')


test('write stream buffer', (t) => {
  var btName = 'foobar'
  var socket = zeromq.socket('sub')
  var isopened = false
  socket.connect(`ipc://${process.env.BLUETOOTH_CHANNEL_PREFIX}/command`)
  socket.subscribe('')
  socket.on('message', (data) => {
    var msg = JSON.parse(data)
    t.equal(msg.proto, 'ROKID_BLE', 'should use ROKID_BLE protocol')
    if (!isopened) {
      t.equal(msg.command, 'ON', 'the command is ON')
      t.equal(msg.name, btName, `the btName is ${btName}`)
      isopened = true
    } else {
      t.equal(msg.data, 'text')
      socket.close()
      bluetooth.disconnect()
      isopened = false
      setTimeout(t.end, 500)
    }
  })

  var messageStream = bluetooth.getMessageStream()
  setTimeout(() => {
    messageStream.start(btName)
    setTimeout(() => {
      messageStream.write('text')
    }, 1000)
  }, 1000)
})
