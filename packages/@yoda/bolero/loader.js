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
   * @param {array} stages - components load stage define.
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
    this.compList = {}
  }

  /**
   * find all component file
   * @param {array} paths - paths of component
   */
  loadComponentFile(paths) {
    // get all files
    paths.forEach((dir) => {
      try {
        var files = fs.readdirSync(dir)
        files.filter(it => _.endsWith(it, '.js')).forEach((it) => {
          var compName = path.basename(it, '.js')
          if (this.compList.hasOwnProperty(compName)) {
            logger.error(`component exists: ${this.compList[compName]} ${path.join(dir, it)}`)
          } else {
            this.compList[compName] = path.join(dir, it)
            logger.error(`find component file: ${compName}`)
          }
        })
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err
        }
        logger.error(`directory '${dir}' doesn't exist, skipping...`)
      }
    })
  }
  /**
   * Loads component in stage
   *
   * @param {array} comps - all components in this stage
   */
  loadStage (comps) {
    comps.forEach(it => {
      if (this.compList.hasOwnProperty(it)) {
        logger.info(`load component ${it}`)
        try {
          var comp = require(this.compList[it])
          this.register(it, comp, comp.dependencies || [])
        } catch (err) {
          logger.error(`stage ${it}: ${err}`)
        }
        delete this.compList[it]
      } else {
        logger.error(`component [${it}] not exist.`)
      }
    })
    return Promise.resolve()
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
