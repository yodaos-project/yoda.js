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

function startWithRetry (name, handle, cb, maxCount) {
  var count = 0
  var timer = setInterval(() => {
    if (count >= maxCount) {
      clearInterval(timer)
      // throw the connect error.
      var err = new Error('bluetooth connect failed')
      if (typeof cb === 'function') {
        cb(err)
      } else {
        throw err
      }
    } else {
      count += 1
      handle.start(name)
    }
  }, 200)
  handle.once('opened', () => {
    clearInterval(timer)
    if (typeof cb === 'function') {
      cb()
    }
  })
  handle.start(name)
}

function closeSocket (handle) {
  handle.removeAllListeners()
  handle._eventSocket.close()
}

function disconnectAfterClose (handle, timeout) {
  var close = closeSocket.bind(null, handle)
  handle.end()
  handle.once('closed', close)
  setTimeout(close, timeout)
}

exports.CHANNEL_PREFIX = CHANNEL_PREFIX
exports.getSocket = getSocket
exports.getCmdSocket = getCmdSocket
exports.closeCmdSocket = closeCmdSocket
exports.startWithRetry = startWithRetry
exports.disconnectAfterClose = disconnectAfterClose
