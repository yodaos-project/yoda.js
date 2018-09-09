'use strict'

var zeromq = require('zeromq')
var CHANNEL_PREFIX = process.env.BLUETOOTH_CHANNEL_PREFIX || '/var/run/bluetooth'
var cmdPath = `ipc://${CHANNEL_PREFIX}/command`
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

function closeCmdSocket () {
  if (cmdSocket) {
    cmdSocket.close()
    cmdSocket = null
  }
}

exports.CHANNEL_PREFIX = CHANNEL_PREFIX
exports.getSocket = getSocket
exports.getCmdSocket = getCmdSocket
exports.closeCmdSocket = closeCmdSocket
