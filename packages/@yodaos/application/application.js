var delegate = require('@yoda/util/delegate')

var classLoader = require('./class-loader')
var symbol = require('./symbol')

function invoke (target, optionProp, args) {
  var fn = target[symbol.options][optionProp]
  if (typeof fn === 'function') {
    return fn.apply(target, args)
  }
}

/**
 * @typedef ApplicationInit
 * @memberof module:@yodaos/application
 * @property {Function} created
 * @property {Function} destroyed
 * @property {Function} url
 * @property {Function} broadcast
 */

/**
 *
 * @memberof module:@yodaos/application
 * @param {module:@yodaos/application~ApplicationInit} options
 * @returns {module:@yodaos/application~ApplicationPrototype}
 * @example
 * var Application = require('@yodaos/application').Application
 *
 * module.exports = Application({
 *   url: function url (urlObj) {
 *     this.startService('demo')
 *   }
 * })
 */
function Application (options, api) {
  if (api == null) {
    api = global[symbol.api]
  }
  var application = api[symbol.application]
  if (application != null) {
    throw new Error('Multiple calls on Application.')
  }
  application = api[symbol.application] = Object.create(ApplicationProto)
  application[symbol.api] = api
  application[symbol.options] = options
  application[symbol.activeServices] = []

  var registry = application[symbol.registry] = { service: {}, activity: {} }
  classLoader.loadPackage(api, registry)

  ;['created', 'destroyed'].forEach(eve => {
    api.on(eve, () => {
      invoke(application, eve)
    })
  })

  ;['url', 'broadcast'].forEach(eve => {
    var handler = application[symbol.options][eve]
    if (typeof handler !== 'function') {
      return
    }

    api.on(eve, handler.bind(application))
  })

  return application
}

/**
 * @class ApplicationPrototype
 * @memberof module:@yodaos/application
 * @hideconstructor
 */
var ApplicationProto = {
  startService: startService,
  getService: getService,
  getRuntime: getRuntime,
  [symbol.finishService]: finishService,
  [symbol.finalize]: finalize
}

delegate(ApplicationProto, symbol.api)
  /**
   *
   * @memberof module:@yodaos/application~ApplicationPrototype
   * @method openUrl
   * @param {string} url
   */
  .method('openUrl')
  /**
   *
   * @memberof module:@yodaos/application~ApplicationPrototype
   * @method startMonologue
   */
  .method('startMonologue')
  /**
   *
   * @memberof module:@yodaos/application~ApplicationPrototype
   * @method stopMonologue
   */
  .method('stopMonologue')

/**
 *
 * @memberof module:@yodaos/application~ApplicationPrototype
 * @param {string} name
 */
function startService (name) {
  var idx = this[symbol.activeServices].indexOf(name)
  if (idx >= 0) {
    return
  }
  this[symbol.activeServices].push(name)
  var component = classLoader.getComponent(this, name, 'service')
  invoke(component, 'created')
}

/**
 *
 * @memberof module:@yodaos/application~ApplicationPrototype
 * @param {string} name
 * @returns {Service | undefined}
 */
function getService (name) {
  var idx = this[symbol.activeServices].indexOf(name)
  if (idx < 0) {
    return
  }
  return classLoader.getComponent(this, name, 'service')
}

/**
 *
 * @memberof module:@yodaos/application~ApplicationPrototype
 * @returns {yodaRT.activity.Activity.RuntimeClient}
 */
function getRuntime () {
  return this[symbol.api].runtime
}

function finishService (service) {
  var name = service[symbol.componentName]
  var idx = this[symbol.activeServices].indexOf(name)
  if (idx < 0) {
    return
  }
  this[symbol.activeServices].splice(idx, 1)
  var component = classLoader.getComponent(this, name, 'service')
  invoke(component, 'destroyed')
  this[symbol.finalize]()
}

function finalize () {
  if (this[symbol.activeServices].length > 0) {
    return
  }
  this[symbol.api].exit()
}

module.exports = Application
