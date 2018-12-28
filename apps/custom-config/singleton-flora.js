'use strict'
var FloraAgent = require('@yoda/flora').Agent

var singletonFlora

module.exports.getInstance = function getInstance () {
  if (!singletonFlora) {
    // TODO get the app name to complete flora url
    singletonFlora = new FloraAgent('unix:/var/run/flora.sock')
    singletonFlora.start()
  }
  return singletonFlora
}

module.exports.MSGTYPE_INSTANT = FloraAgent.MSGTYPE_INSTANT
module.exports.MSGTYPE_PERSIST = FloraAgent.MSGTYPE_PERSIST
module.exports.MSGTYPE_REQUEST = FloraAgent.MSGTYPE_REQUEST
