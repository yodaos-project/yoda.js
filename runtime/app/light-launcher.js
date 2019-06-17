'use strict'

var logger = require('logger')('lapp')

var _ = require('@yoda/util')._
var translate = require('../client/translator-in-process').translate
/**
 *
 * @param {string} appId -
 * @param {string} target - app home directory
 * @param {AppRuntime} runtime
 */
module.exports = function launchLightApp (appId, appDir, bridge, options) {
  logger.log(`load target: ${appDir}/package.json`)
  var pkg = require(`${appDir}/package.json`)
  var main = `${appDir}/${pkg.main || 'app.js'}`

  logger.log('descriptor created.')
  var descriptor = require(_.get(options, 'descriptorPath', '../client/api/default.json'))
  var activity = translate(descriptor, bridge)
  activity.appId = appId
  activity.appHome = appDir
  logger.log('descriptor translated.')
  bridge.activity = activity

  try {
    logger.log(`load main: ${main}`)
    var handle = require(main)
    if (typeof handle === 'function') {
      handle(activity)
    }
  } catch (err) {
    logger.error(`unexpected error on light app ${main}`, err.message, err.stack)
    delete require.cache[main]
    return Promise.reject(err)
  }
  bridge.didReady()

  return Promise.resolve(null)
}
