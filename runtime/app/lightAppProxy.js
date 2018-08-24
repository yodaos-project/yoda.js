'use strict'

var logger = require('logger')('lightAppProxy')
var LightApp = require('./lightApp')

module.exports = function lightAppProxy (target) {
  return function (appId, runtime) {
    logger.log(`load target: ${target}/package.json`)
    var pkg = require(`${target}/package.json`)
    var main = `${target}/${pkg.main || 'app.js'}`

    logger.log(`load main: ${main}`)
    var handle = require(main)
    var lightapp = new LightApp(appId, runtime)
    lightapp.appHome = target
    try {
      handle(lightapp.app)
    } catch (err) {
      logger.error(`unexpected error on light app ${main}`, err.message, err.stack)
    }
    return lightapp
  }
}
