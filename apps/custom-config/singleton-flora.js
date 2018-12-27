'use strict'
var FloraAgent = require('@yoda/flora').Agent

var singletonFlora

module.exports = class SingleFloraAgent {
  static getInstance () {
    if (!singletonFlora) {
      // TODO get the app name to complete flora url
      singletonFlora = new FloraAgent('unix:/var/run/flora.sock')
      singletonFlora.start()
    }
    return singletonFlora
  }
}
