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
  constructor (runtime, property, stages) {
    this.registry = {}
    this.cache = {}
    this.runtime = runtime
    this.property = property
    if (this.runtime[this.property] == null) {
      this.runtime[this.property] = {}
    }
    this.target = this.runtime[this.property]
    this.stages = []
    //if (stages instanceof Array) {
      stages.forEach(it => {
    //    if (typeof it === 'object' && typeof it.name === 'string' && it.comps instanceof Array) {
          if (it.comps.length > 0) {
            it.callback = {
              before: null,
              after: null
            }
            this.stages.push(it)
          }
    //    } else {
    //      logger.error(`component stages define error: ${JSON.stringify(it)}`)
    //    }
      })
    //}
  }

  /**
   * register before event handler
   * @param {string} event - event name
   * @param {function} callback -
   */
  before (event, callback) {
    if (typeof callback === 'function' && typeof event === 'string') {
      this.stages.filter(it => it.name === event).map((it) => {
        it.callback.before = callback
      })
    } else {
      logger.error('error param of loader.before')
    }
  }
  /**
   * register after event handler
   * @param {string} event - event name
   * @param {function} callback -
   */
  after (event, callback) {
    if (typeof callback === 'function' && typeof event === 'string') {
      this.stages.filter(it => it.name === event).forEach((it) => {
        it.callback.after = callback
      })
    } else {
      logger.error('error param of loader.after')
    }
  }
  /**
   * Loads all component
   *
   * @param {array} compDirs - components directories to be loaded.
   */
  load (compDirs) {
    var compList = {}
    var rst = []
    compDirs.forEach((dir) => {
      var files = []
      try {
        files = fs.readdirSync(dir)
        files.filter(it => _.endsWith(it, '.js')).forEach((it) => {
          var compName = path.basename(it, '.js')
          if (compList.hasOwnProperty(compName)) {
            logger.error(`component exists: ${compList[compName]} ${path.join(dir, it)}`)
          } else {
            compList[compName] = path.join(dir, it)
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
    this.stages.forEach((stage, index) => {
      stage.callback.before()
      stage.comps.forEach(it => {
        if (compList.hasOwnProperty(it)) {
          try {
            var comp = require(compList[it])
            this.register(it, comp, comp.dependencies || [])
            logger.error(`component [${compName}] loaded`)
          } catch (err) {
            logger.error(`stage ${it}: ${err}`)
          }
          delete compList[it]
        } else {
          logger.error(`component [${it}] in stage [${stage.name}] not exist.`)
        }
      })
      // last stage, we need to load all left components
      if (index !== this.stages.length - 1) {
        for (var key in compList) {
          try {
            var comp = require(compList[key])
            this.register(key, comp, comp.dependencies || [])
            logger.error(`left component [${compName}] loaded`)
          } catch (err) {
            logger.error(`stage ${key}: ${err}`)
          }
        }
      }
      stage.callback.after()
    })
    return rst
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
