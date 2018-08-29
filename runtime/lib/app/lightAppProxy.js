'use strict'

var logger = require('logger')('lapp')
var createContext = require('./activity').createContext
var translate = require('../../client/translator-in-process').translate

module.exports = function lightAppProxy (target) {
  return function (appId, runtime) {
    logger.log(`load target: ${target}/package.json`)
    var pkg = require(`${target}/package.json`)
    var main = `${target}/${pkg.main || 'app.js'}`

    var context = createContext(appId, target, runtime)
    var activity = translate(context)
    logger.log('activity initiated.')
    console.log(Object.keys(activity), typeof activity.on)
    console.log(Object.keys(activity.tts))

    try {
      logger.log(`load main: ${main}`)
      var handle = require(main)
      handle(activity)
    } catch (err) {
      logger.error(`unexpected error on light app ${main}`, err.message, err.stack)
    }

    return context
  }
}
