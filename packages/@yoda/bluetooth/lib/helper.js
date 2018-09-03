'use strict'

var zeromq = require('zeromq')
var cmdPath = 'ipc:///var/run/bluetooth/command'
var cmdSocket

function getSocket (path, filter) {
  var socket = zeromq.socket('sub')
  socket.connect(path)
  socket.subscribe(filter || '')
  return socket
}

function getCmdSocket () {
  if (cmdSocket) {
    return cmdSocket
  } else {
    cmdSocket = zeromq.socket('pub')
    cmdSocket.bindSync(cmdPath)
    return cmdSocket
  }
}

exports.getSocket = getSocket
exports.getCmdSocket = getCmdSocket
