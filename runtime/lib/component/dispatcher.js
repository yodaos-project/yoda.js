var _ = require('@yoda/util')._
var logger = require('logger')('dispatcher')

var config = require('/etc/yoda/component-config.json')

/**
 * Event/Command Dispatcher.
 */
class Dispatcher {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component
  }

  /**
   * Delegates runtime/component event to interceptors.
   * @param {string} event - event name to be handled
   * @param {any[]} args - arguments of the event
   * @returns {false|any} return false if there is no interceptor responds. Anything truthy otherwise.
   */
  delegate (event, args) {
    var components = _.get(config.interception, event)
    logger.info(`prepare dispatching delegation(${event})`, components)
    if (!Array.isArray(components)) {
      return false
    }

    for (var idx in components) {
      var name = components[idx]
      if (typeof name !== 'string') {
        continue
      }
      var component = this.component[name]
      if (component == null) {
        continue
      }
      var handler = component[event]
      if (typeof handler !== 'function') {
        continue
      }
      logger.info(`dispatch delegation(${event}) to ${name}`)
      var ret = handler.apply(component, args)
      if (!ret) {
        logger.info(`delegation(${event}) to ${name} skipped`)
        continue
      }
      logger.info(`delegation(${event}) to ${name} accepted`)
      return ret
    }

    return false
  }
}

module.exports = Dispatcher
