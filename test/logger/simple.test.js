'use strict'

//process.env.LOG_PORT = 8081

var test = require('tape')
var net = require('net')
var logger = require('logger')('log')

test.skip('simple ', function (t) {
  t.plan(1)
  var socket = net.connect(process.env.LOG_PORT)
  var text = 'foobar'
  socket.on('data', (buf) => {
    socket.end()
    t.assert(buf + '', text)
    logger.closeServer()
    t.end()
  })
  logger.log(text)
})
