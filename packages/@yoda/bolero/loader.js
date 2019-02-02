/**
 * @module @yoda/bolero
 */

var fs = require('fs')
var path = require('path')

var logger = require('logger')('bolero/loader')
var _ = require('@yoda/util')._

/**
 * Module loader. Loads modules under a directory as a lazily instantiated getter to target.
 */
class Loader {
  /**
   *
   * @param {object} runtime - an object named runtime.
   * @param {string} property - target property name on runtime object.
   */
  constructor (runtime, property) {
    this.registry = {}
    this.cache = {}
    this.runtime = runtime
    this.property = property

    if (this.runtime[this.property] == null) {
      this.runtime[this.property] = {}
    }
    this.target = this.runtime[this.property]
  }

  /**
   * Loads the directory and defines getters on target.
   *
   * @param {string} compDir - components directory to be loaded.
   */
  load (compDir) {
    var entities
    try {
      entities = fs.readdirSync(compDir)
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err
      }
      entities = []
      logger.error(`directory '${compDir}' doesn't exist, skipping...`)
    }
    return entities
      .filter(it => _.endsWith(it, '.js'))
      .map(it => {
        var comp = require(path.join(compDir, it))
        this.register(path.basename(it, '.js'), comp, comp.dependencies || [])
      })
  }

  /**
   * Attach the class to target with the name camel cased.
   *
   * @private
   * @param {string} name - name of the class
   * @param {Function} Klass - Class constructor
   */
  loadToTarget (name, Klass) {
    Object.defineProperty(this.target, name, {
      enumerable: true,
      configurable: true,
      get: () => {
        var instance = this.cache[name]
        if (!instance) {
          instance = new Klass(this.runtime)
          this.cache[name] = instance
        }
        return instance
      }
    })
  }

  /**
   * Register the class.
   *
   * @param {string} name - name of the class
   * @param {Function} Klass - Class constructor
   */
  register (name, Klass) {
    name = _.camelCase(name)
    if (this.registry[name]) {
      throw new Error(`Conflict registration on '${name}'.`)
    }
    this.registry[name] = Klass
    this.loadToTarget(name, Klass)
  }
}

module.exports = Loader
