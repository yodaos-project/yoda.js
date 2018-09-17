'use strict'

var test = require('tape')
var zeromq = require('zeromq')
var bluetooth = require('@yoda/bluetooth')

test('start command', (t) => {
  var btName = 'foobar'
  var btName1 = 'foobar1'
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

  var messageStream = bluetooth.getMessageStream()
  setTimeout(() => {
    //after socket connect successfully,try send cmd message 'ON'
    messageStream.start(btName)
    //after socket connect successfully,double try send cmd message 'ON'
    messageStream.start(btName1)
  }, 1000)
})

