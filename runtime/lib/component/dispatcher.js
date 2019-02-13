var logger = require('logger')('dispatcher')
var _ = require('@yoda/util')._

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

  /**
   * Dispatch an event to app. App would be created if app is not running.
   *
   * @param {string} appId
   * @param {string} event
   * @param {any[]} params
   * @param {object} [options]
   * @param {boolean} [options.preemptive=true] - if app is preemptive
   * @param {'cut' | 'scene'} [options.form='cut']
   * @param {string} [options.skillId] - cloud skill stack would be updated to given skill id.
   * @param {string} [options.carrierId] - if app is brought to life by other app
   */
  dispatchAppEvent (appId, event, params, options) {
    var preemptive = _.get(options, 'preemptive', true)
    var form = _.get(options, 'form', 'cut')
    var skillId = _.get(options, 'skillId')
    var carrierId = _.get(options, 'carrierId')

    if (this.runtime.hasBeenDisabled()) {
      logger.warn(`runtime has been disabled ${this.runtime.getDisabledReasons()}, skip dispatching event(${event}) to app(${appId}).`)
      return Promise.resolve(false)
    }

    if (this.component.lifetime.guardMonopolization(appId, { form: form, preemptive: preemptive })) {
      logger.warn(`LaVieEnPile has ben monopolized, skip dispatching event(${event}) to app(${appId}.`)
      return this.component.lifetime.onLifeCycle(this.component.lifetime.monopolist, 'oppressing', event)
        .then(() => /** event has been handled, prevent tts/media from recovering */true)
    }

    return this.component.lifetime.createApp(appId)
      .catch(err => {
        logger.error(`create app ${appId} failed`, err.stack)
        /** force quit app on create error */
        return this.component.lifetime.destroyAppById(appId, { force: true })
          .then(() => { /** rethrow error to break following procedures */throw err })
      })
      .then(() => {
        if (!preemptive) {
          logger.info(`app is not preemptive, skip activating app ${appId}`)
          return
        }

        logger.info(`app is preemptive, activating app ${appId}`)
        return this.component.lifetime.activateAppById(appId, form, carrierId)
          .then(() => {
            this.runtime.updateCloudStack(skillId, form)
            this.component.sound.unmuteIfNecessary(skillId)
          })
      })
      .then(() => this.component.lifetime.onLifeCycle(appId, event, params))
      .then(() => true)
      .catch(err => {
        logger.error(`Unexpected error on sending event(${event}) to ${appId}`, err.stack)
        return false
      })
  }
}

module.exports = Dispatcher
