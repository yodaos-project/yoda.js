'use strict'

function closeSocket (handle) {
  handle.removeAllListeners()
  handle._flora.destruct()
}

function disconnectAfterClose (handle, timeout) {
  var close = closeSocket.bind(null, handle)
  handle.end()
  handle.once('closed', close)
  setTimeout(close, timeout)
}

exports.disconnectAfterClose = disconnectAfterClose
