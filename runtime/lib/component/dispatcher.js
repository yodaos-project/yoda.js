var logger = require('logger')('dispatcher')

var config = require('/etc/yoda/component-config.json')

/**
 * Event/Command Dispatcher.
 */
class Dispatcher {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component

    this.config = this.validateConfig(config)
  }

  /**
   *
   * @private
   * @param {any} config
   */
  validateConfig (config) {
    var ret = { interception: {} }
    Object.keys(config.interception).forEach(key => {
      var match = key.split('.', 2)
      var componentName = match[0]
      if (this.runtime.componentLoader.registry[componentName] == null) {
        throw new Error(`Unknown component(${componentName}) on component-config`)
      }
      var targets = config.interception[key]
      if (!Array.isArray(targets)) {
        throw new Error(`Unexpected value on component-config.interception.${key}`)
      }
      var result = targets.map((it, idx) => {
        if (typeof it !== 'string') {
          throw new Error(`Unexpected value on component-config.interception.${key}.${idx}`)
        }
        var match = it.split('.', 2)
        var componentName = match[0]
        if (this.runtime.componentLoader.registry[componentName] == null) {
          throw new Error(`Unknown component(${componentName}) on component-config`)
        }
        return { component: componentName, method: match[1] }
      })
      ret.interception[key] = result
    })

    return ret
  }

  /**
   * Delegates runtime/component event to interceptors.
   * @param {string} event - event name to be handled
   * @param {any[]} args - arguments of the event
   * @returns {false|any} return false if there is no interceptor responds. Anything truthy otherwise.
   */
  delegate (event, args) {
    var components = this.config.interception[event]
    if (!Array.isArray(components)) {
      return false
    }

    for (var idx in components) {
      var name = components[idx].component
      var method = components[idx].method
      if (typeof name !== 'string') {
        continue
      }
      var component = this.component[name]
      if (component == null) {
        continue
      }
      var handler = component[method]
      if (typeof handler !== 'function') {
        logger.warn(`delegation(${event}) target ${name}.${method} is not a function`)
        continue
      }
      logger.info(`dispatch delegation(${event}) to ${name}.${method}`)
      var ret
      try {
        ret = handler.apply(component, args)
      } catch (err) {
        logger.error(`dispatch delegation(${event}) to ${name}.${method} failed with error`, err.stack)
        continue
      }
      if (!ret) {
        logger.info(`delegation(${event}) to ${name}.${method} skipped`)
        continue
      }
      logger.info(`delegation(${event}) to ${name}.${method} accepted`)
      return ret
    }

    return false
  }
}

module.exports = Dispatcher
