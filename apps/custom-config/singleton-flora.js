'use strict'
var FloraAgent = require('@yoda/flora').Agent

var singletonFlora

module.exports = function getInstance () {
  if (!singletonFlora) {
    // TODO get the app name to complete flora url
    singletonFlora = new FloraAgent('unix:/var/run/flora.sock')
    singletonFlora.start()
  }
  return singletonFlora
}
