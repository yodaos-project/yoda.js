'use strict'

var logger = require('logger')('lapp')
var ActivityDescriptor = require('./activity-descriptor').ActivityDescriptor
var translate = require('../../client/translator-in-process').translate

module.exports = function createLightApp (target, appId, runtime) {
  logger.log(`load target: ${target}/package.json`)
  var pkg = require(`${target}/package.json`)
  var main = `${target}/${pkg.main || 'app.js'}`

  var descriptor = new ActivityDescriptor(appId, target, runtime)
  logger.log('descriptor created.')
  var activity = translate(descriptor)
  logger.log('descriptor translated.')
  descriptor.activity = activity

  try {
    logger.log(`load main: ${main}`)
    var handle = require(main)
    handle(activity)
  } catch (err) {
    logger.error(`unexpected error on light app ${main}`, err.message, err.stack)
  }

  return descriptor
}
