var delegate = require('@yoda/util/delegate')
var symbol = require('./symbol')

/**
 * @typedef ServiceInit
 * @memberof module:@yodaos/application
 * @property {Function} created
 * @property {Function} destroyed
 */

/**
 *
 * @memberof module:@yodaos/application
 * @param {module:@yodaos/application~ServiceInit} options
 * @returns {module:@yodaos/application~ServicePrototype}
 * @example
 * var Service = require('@yodaos/application').Service
 *
 * module.exports = Service({
 *   created: function created () {
 *     console.log('demo service created')
 *   },
 *   destroyed: function destroyed () {
 *     console.log('demo service destroyed')
 *   }
 * })
 */
function Service (options, api) {
  if (api == null) {
    api = global[symbol.api]
  }
  var service = Object.create(ComponentProto)
  service[symbol.api] = api
  service[symbol.application] = api[symbol.application]
  service[symbol.options] = options
  return service
}

/**
 * @class ServicePrototype
 * @memberof module:@yodaos/application
 * @hideconstructor
 */
var ComponentProto = {
  getApplication: getApplication,
  finish: finish
}

delegate(ComponentProto, symbol.application)
  /**
   *
   * @method startService
   * @memberof module:@yodaos/application~ServicePrototype
   * @param {string} name
   */
  .method('startService')
  /**
   *
   * @method openUrl
   * @memberof module:@yodaos/application~ServicePrototype
   * @param {string} url
   */
  .method('openUrl')

/**
 * Get application instance.
 * @memberof module:@yodaos/application~ServicePrototype
 */
function getApplication () {
  return this[symbol.application]
}

/**
 * Finish current service instance.
 * @memberof module:@yodaos/application~ServicePrototype
 */
function finish () {
  var application = this[symbol.application]
  application[symbol.finishService](this)
}

module.exports = Service
