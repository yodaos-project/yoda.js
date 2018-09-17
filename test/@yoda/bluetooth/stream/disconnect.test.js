'use strict'

var test = require('tape')
var zeromq = require('zeromq')
var bluetooth = require('@yoda/bluetooth')

test('disconnect command', (t) => {
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
    }else {
      t.equal(msg.command, 'OFF', 'the command is OFF')
      t.end()
      socket.close()
      isopened = false
    }
  })


  var messageStream = bluetooth.getMessageStream()
  setTimeout(() => {
    //after socket connect successfully,try send cmd message 'ON'
    messageStream.start(btName)
    setTimeout(() => {
      messageStream.disconnect()
      setTimeout(() => {
        messageStream.start(btName)
        t.ok(isopened == false)
        t.end()
      }, 2000)
    }, 1000)
  },1000)
})
