'use strict'
var FloraAgent = require('@yoda/flora')

var singletonFlora

module.exports.getInstance = function getInstance () {
  if (!singletonFlora) {
    // TODO get the app name to complete flora url
    singletonFlora = new FloraAgent.Agent('unix:/var/run/flora.sock')
    singletonFlora.start()
  }
  return singletonFlora
}

exports.MSGTYPE_INSTANT = FloraAgent.MSGTYPE_INSTANT
exports.MSGTYPE_PERSIST = FloraAgent.MSGTYPE_PERSIST
exports.MSGTYPE_REQUEST = FloraAgent.MSGTYPE_REQUEST
