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
    if (typeof config !== 'object') {
      throw new Error('Invalid component-config.json')
    }
    var ret = { interception: {} }
    if (typeof config.interception !== 'object') {
      throw new Error('config.interception is not an object.')
    }
    Object.keys(config.interception).forEach(event => {
      var targets = config.interception[event]
      if (!Array.isArray(targets)) {
        throw new Error(`Unexpected value on component-config.interception.${event}`)
      }
      var result = targets.map((it, idx) => {
        if (typeof it !== 'string') {
          throw new Error(`Unexpected value on component-config.interception.${event}.${idx}`)
        }
        var match = it.split('.', 2)
        var componentName = match[0]
        if (this.runtime.componentLoader.registry[componentName] == null) {
          throw new Error(`Unknown component(${componentName}) on component-config`)
        }
        return { component: componentName, method: match[1] }
      })
      ret.interception[event] = result
    })

    return ret
  }

  /**
   * Delegates runtime/component event to interceptors.
   * @param {string} event - event name to be handled
   * @param {any[]} args - arguments of the event
   * @returns {Promise<false|any>} return a promise resolved by false if there
   * is no interceptor responds. Resolved with anything truthy otherwise.
   */
  delegate (event, args) {
    var self = this
    var components = self.config.interception[event]
    if (!Array.isArray(components)) {
      return Promise.resolve(false)
    }
    return Promise.resolve(step(0))

    function step (idx) {
      if (idx >= components.length) {
        return false
      }
      var name = components[idx].component
      var method = components[idx].method
      if (typeof name !== 'string') {
        return false
      }
      var component = self.component[name]
      if (component == null) {
        return false
      }
      var handler = component[method]
      if (typeof handler !== 'function') {
        logger.warn(`delegation(${event}) target ${name}.${method} is not a function`)
        return false
      }
      logger.info(`dispatch delegation(${event}) to ${name}.${method}`)
      var ret
      try {
        ret = handler.apply(component, args)
      } catch (err) {
        logger.error(`dispatch delegation(${event}) to ${name}.${method} failed with error`, err.stack)
        return false
      }
      return Promise.resolve(ret)
        .then((val) => {
          if (val) {
            logger.info(`delegation(${event}) to ${name}.${method} accepted`)
            return val
          }
          logger.info(`delegation(${event}) to ${name}.${method} skipped`)
          return step(idx + 1)
        })
    }
  }
}

module.exports = Dispatcher
