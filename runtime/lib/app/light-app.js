'use strict'

var logger = require('logger')('lapp')

var _ = require('@yoda/util')._
var translate = require('../../client/translator-in-process').translate
/**
 *
 * @author Chengzhong Wu <chengzhong.wu@rokid.com>
 * @param {string} appId -
 * @param {string} target - app home directory
 * @param {AppRuntime} runtime
 */
module.exports = function createLightApp (appId, metadata, bridge, options) {
  var target = _.get(metadata, 'appHome')
  logger.log(`load target: ${target}/package.json`)
  var pkg = require(`${target}/package.json`)
  var main = `${target}/${pkg.main || 'app.js'}`

  logger.log('descriptor created.')
  var descriptor = require(_.get(options, 'descriptorPath', '../../client/api/default.json'))
  var activity = translate(descriptor, bridge)
  logger.log('descriptor translated.')
  bridge.activity = activity

  try {
    logger.log(`load main: ${main}`)
    var handle = require(main)
    handle(activity)
  } catch (err) {
    logger.error(`unexpected error on light app ${main}`, err.message, err.stack)
    delete require.cache[main]
    return Promise.reject(err)
  }

  return Promise.resolve(bridge)
}
