'use strict'

var test = require('tape')
var zeromq = require('zeromq')
var bluetooth = require('@yoda/bluetooth')

test('start command', (t) => {
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
      bluetooth.disconnect()
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
    messageStream.start(btName)
  }, 1000)
})

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
    messageStream.write('text')
  }, 1000)
})

test('handle data listener', (t) => {
  var btName = 'foobar'
  var socket = zeromq.socket('sub')
  var source = zeromq.socket('pub')
  source.bindSync(`ipc://${process.env.BLUETOOTH_CHANNEL_PREFIX}/rokid_ble_event`)
  socket.connect(`ipc://${process.env.BLUETOOTH_CHANNEL_PREFIX}/command`)
  socket.subscribe('')
  socket.on('message', (data) => {
    var msg = JSON.parse(data)
    t.equal(msg.proto, 'ROKID_BLE', 'should use ROKID_BLE protocol')
    t.equal(msg.command, 'ON', 'the command is ON')
    t.equal(msg.name, btName, `the btName is ${btName}`)
    source.send(JSON.stringify({ data: 'foobar' }))
  })

  var messageStream = bluetooth.getMessageStream()
  messageStream.on('data', (message) => {
    t.equal(message, 'foobar')
    socket.close()
    source.close()
    bluetooth.disconnect()
    setTimeout(t.end, 500)
  })

  setTimeout(() => {
    messageStream.start(btName)
  }, 1000)
})


