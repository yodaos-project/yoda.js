var AppRuntime = require('./mock-app-runtime')

/**
 * @module @yoda/mock
 */

module.exports.mockAppRuntime = mockAppRuntime
/**
 *
 * @param {string} app - app home
 *
 * @example
 * var mock = require('@yoda/mock')
 *
 * mock('/opt/apps/guidance')
 *   .then(runtime => {
 *     runtime.mockAsr('你能干什么')
 *   })
 *
 * @example
 * var mock = require('@yoda/mock')
 *
 * mock('/opt/apps/guidance')
 *   .then(runtime => {
 *     return runtime.life.createApp('@yoda/guidance')
 *   })
 *   .then(activity => {
 *     `...do anything with activity...`
 *   })
 */
function mockAppRuntime (app) {
  var appRuntime = new AppRuntime()
  return appRuntime.init([ app ])
    .then(() => appRuntime)
}
