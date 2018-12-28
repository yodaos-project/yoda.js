'use strict'
var flora = require('@yoda/flora')

var singletonFlora

module.exports.getInstance = function getInstance () {
  if (!singletonFlora) {
    // TODO get the app name to complete flora url
    singletonFlora = new flora.Agent('unix:/var/run/flora.sock')
    singletonFlora.start()
  }
  return singletonFlora
}

exports.MSGTYPE_INSTANT = flora.MSGTYPE_INSTANT
exports.MSGTYPE_PERSIST = flora.MSGTYPE_PERSIST
exports.MSGTYPE_REQUEST = flora.MSGTYPE_REQUEST
